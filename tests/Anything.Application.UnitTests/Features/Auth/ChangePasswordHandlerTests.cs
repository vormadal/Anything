using Anything.Application.Features.Auth.Commands;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class ChangePasswordHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IPasswordService _passwordService = Substitute.For<IPasswordService>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private ChangePasswordHandler CreateHandler() =>
        new(_userRepo, _unitOfWork, _passwordService, _timeProvider);

    public ChangePasswordHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsNotFound()
    {
        _userRepo.GetById(1).Returns((User?)null);

        var result = await CreateHandler().Handle(new ChangePasswordCommand(1, "old", "new"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenUserDeleted_ReturnsNotFound()
    {
        _userRepo.GetById(1).Returns(new User
        {
            Id = 1, Email = "a@b.com", Name = "A", Role = "User", PasswordHash = "hash",
            DeletedOn = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        var result = await CreateHandler().Handle(new ChangePasswordCommand(1, "old", "new"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenCurrentPasswordWrong_ReturnsProblem()
    {
        _userRepo.GetById(1).Returns(new User { Id = 1, Email = "a@b.com", Name = "A", Role = "User", PasswordHash = "hash" });
        _passwordService.VerifyPassword("wrong", "hash").Returns(false);

        var result = await CreateHandler().Handle(new ChangePasswordCommand(1, "wrong", "newpass"), TestContext.Current.CancellationToken);

        Assert.IsType<ProblemHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WithValidCurrentPassword_UpdatesHashAndReturnsNoContent()
    {
        var user = new User { Id = 1, Email = "a@b.com", Name = "A", Role = "User", PasswordHash = "oldhash" };
        _userRepo.GetById(1).Returns(user);
        _passwordService.VerifyPassword("oldpass", "oldhash").Returns(true);
        _passwordService.HashPassword("newpass").Returns("newhash");

        var result = await CreateHandler().Handle(new ChangePasswordCommand(1, "oldpass", "newpass"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("newhash", user.PasswordHash);
        Assert.NotNull(user.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsModifiedOnToNow()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);

        var user = new User { Id = 1, Email = "a@b.com", Name = "A", Role = "User", PasswordHash = "hash" };
        _userRepo.GetById(1).Returns(user);
        _passwordService.VerifyPassword(Arg.Any<string>(), Arg.Any<string>()).Returns(true);
        _passwordService.HashPassword(Arg.Any<string>()).Returns("newhash");

        await CreateHandler().Handle(new ChangePasswordCommand(1, "old", "new"), TestContext.Current.CancellationToken);

        Assert.Equal(now.UtcDateTime, user.ModifiedOn);
    }
}
