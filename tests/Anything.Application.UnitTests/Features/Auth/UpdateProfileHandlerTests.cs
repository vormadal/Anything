using Anything.Application.Features.Auth.Commands;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class UpdateProfileHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private UpdateProfileHandler CreateHandler() =>
        new(_userRepo, _unitOfWork, _timeProvider);

    public UpdateProfileHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsNotFound()
    {
        _userRepo.GetById(1).Returns((User?)null);

        var result = await CreateHandler().Handle(new UpdateProfileCommand(1, "New Name"));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenUserDeleted_ReturnsNotFound()
    {
        _userRepo.GetById(1).Returns(new User
        {
            Id = 1, Email = "a@b.com", Name = "Old", Role = "User", PasswordHash = "hash",
            DeletedOn = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        var result = await CreateHandler().Handle(new UpdateProfileCommand(1, "New Name"));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithValidUser_UpdatesNameAndReturnsNoContent()
    {
        var user = new User { Id = 1, Email = "a@b.com", Name = "Old Name", Role = "User", PasswordHash = "hash" };
        _userRepo.GetById(1).Returns(user);

        var result = await CreateHandler().Handle(new UpdateProfileCommand(1, "New Name"));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Name", user.Name);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsModifiedOnToNow()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var user = new User { Id = 1, Email = "a@b.com", Name = "Old", Role = "User", PasswordHash = "hash" };
        _userRepo.GetById(1).Returns(user);

        await CreateHandler().Handle(new UpdateProfileCommand(1, "New"));

        Assert.Equal(now.UtcDateTime, user.ModifiedOn);
    }
}
