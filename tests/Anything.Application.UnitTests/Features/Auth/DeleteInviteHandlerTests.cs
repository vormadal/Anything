using Anything.Application.Features.Auth.Commands;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Auth;

public class DeleteInviteHandlerTests
{
    private readonly IRepository<UserInvite> _inviteRepo = Substitute.For<IRepository<UserInvite>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private DeleteInviteHandler CreateHandler() => new(_inviteRepo, _unitOfWork);

    [Fact]
    public async Task Handle_WhenNotAdmin_ReturnsForbid()
    {
        var result = await CreateHandler().Handle(new DeleteInviteCommand(1, UserRoles.User), TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenInviteNotFound_ReturnsNotFound()
    {
        _inviteRepo.GetById(1).Returns((UserInvite?)null);

        var result = await CreateHandler().Handle(new DeleteInviteCommand(1, UserRoles.Admin), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithValidInvite_RemovesAndReturnsNoContent()
    {
        var invite = new UserInvite { Id = 1, Email = "test@example.com", Token = "tok" };
        _inviteRepo.GetById(1).Returns(invite);

        var result = await CreateHandler().Handle(new DeleteInviteCommand(1, UserRoles.Admin), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _inviteRepo.Received(1).Remove(invite);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
