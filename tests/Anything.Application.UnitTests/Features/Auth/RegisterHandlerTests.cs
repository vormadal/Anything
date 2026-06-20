using Anything.Application.Features.Auth.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class RegisterHandlerTests
{
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<UserInvite> _inviteRepo = Substitute.For<IRepository<UserInvite>>();
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IRepository<Household> _householdRepo = Substitute.For<IRepository<Household>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IPasswordService _passwordService = Substitute.For<IPasswordService>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private RegisterHandler CreateHandler() =>
        new(_userRepo, _inviteRepo, _memberRepo, _householdRepo, _unitOfWork, _passwordService, _timeProvider);

    public RegisterHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 3, 12, 0, 0, TimeSpan.Zero));
        _passwordService.HashPassword(Arg.Any<string>()).Returns("hashed-password");
    }

    [Fact]
    public async Task Handle_WithValidInvite_CreatesUserAndMarksInviteUsed()
    {
        var invite = new UserInvite
        {
            Id = 1, Email = "new@test.com", Token = "valid-token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc), CreatedByUserId = 1
        };
        _inviteRepo.Query().Returns(new List<UserInvite> { invite }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("new@test.com", "Password123!", "New User", "valid-token"), TestContext.Current.CancellationToken);

        var statusCodeResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(201, statusCodeResult.StatusCode);
        Assert.True(invite.IsUsed);
        _userRepo.Received(1).Add(Arg.Is<User>(u =>
            u.Email == "new@test.com" &&
            u.Name == "New User" &&
            u.PasswordHash == "hashed-password" &&
            u.Role == UserRoles.User));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInvalidToken_ReturnsBadRequest()
    {
        _inviteRepo.Query().Returns(new List<UserInvite>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("test@test.com", "Pass123!", "Test", "invalid-token"), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithExpiredInvite_ReturnsBadRequest()
    {
        var invite = new UserInvite
        {
            Id = 1, Email = "new@test.com", Token = "token",
            ExpiresAt = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc), CreatedByUserId = 1
        };
        _inviteRepo.Query().Returns(new List<UserInvite> { invite }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("new@test.com", "Pass123!", "Test", "token"), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithMismatchedEmail_ReturnsBadRequest()
    {
        var invite = new UserInvite
        {
            Id = 1, Email = "invited@test.com", Token = "token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc), CreatedByUserId = 1
        };
        _inviteRepo.Query().Returns(new List<UserInvite> { invite }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("different@test.com", "Pass123!", "Test", "token"), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithUsedInvite_ReturnsBadRequest()
    {
        // Used invites are filtered out by the query (IsUsed == false), so returns empty
        _inviteRepo.Query().Returns(new List<UserInvite>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("test@test.com", "Pass123!", "Test", "used-token"), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenUserAlreadyExists_ReturnsBadRequest()
    {
        var invite = new UserInvite
        {
            Id = 1, Email = "existing@test.com", Token = "token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc), CreatedByUserId = 1
        };
        _inviteRepo.Query().Returns(new List<UserInvite> { invite }.AsAsyncQueryable());

        var existingUser = new User
        {
            Id = 1, Email = "existing@test.com", PasswordHash = "hash",
            Name = "Existing", Role = "User"
        };
        _userRepo.Query().Returns(new List<User> { existingUser }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("existing@test.com", "Pass123!", "Test", "token"), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithHouseholdInvite_CreatesUserAndAddsMembership()
    {
        var invite = new UserInvite
        {
            Id = 1, Email = "new@test.com", Token = "token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc), CreatedByUserId = 1,
            HouseholdId = 5
        };
        _inviteRepo.Query().Returns(new List<UserInvite> { invite }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());
        _householdRepo.Query().Returns(new List<Household>
        {
            new() { Id = 5, Name = "Test Household" }
        }.AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("new@test.com", "Password123!", "New User", "token"), TestContext.Current.CancellationToken);

        var statusCodeResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(201, statusCodeResult.StatusCode);
        _memberRepo.Received(1).Add(Arg.Is<HouseholdMember>(m => m.HouseholdId == 5 && m.Role == HouseholdRoles.Member));
        await _unitOfWork.Received(2).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenHouseholdInviteButHouseholdDeleted_ReturnsBadRequest()
    {
        var invite = new UserInvite
        {
            Id = 1, Email = "new@test.com", Token = "token",
            ExpiresAt = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc), CreatedByUserId = 1,
            HouseholdId = 5
        };
        _inviteRepo.Query().Returns(new List<UserInvite> { invite }.AsAsyncQueryable());
        _userRepo.Query().Returns(new List<User>().AsAsyncQueryable());
        _householdRepo.Query().Returns(new List<Household>().AsAsyncQueryable());

        var handler = CreateHandler();
        var result = await handler.Handle(new RegisterCommand("new@test.com", "Password123!", "New User", "token"), TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        _userRepo.DidNotReceive().Add(Arg.Any<User>());
    }
}
