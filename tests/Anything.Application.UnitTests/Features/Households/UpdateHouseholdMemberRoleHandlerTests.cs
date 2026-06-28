using Anything.Application.Features.Households.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Households;

public class UpdateHouseholdMemberRoleHandlerTests
{
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private UpdateHouseholdMemberRoleHandler CreateHandler() => new(_memberRepo, _unitOfWork);

    private void SeedMembers(params HouseholdMember[] members) =>
        _memberRepo.Query().Returns(members.ToList().AsAsyncQueryable());

    [Fact]
    public async Task Handle_WhenRequesterIsNotOwner_ReturnsForbid()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Admin });

        var result = await CreateHandler().Handle(
            new UpdateHouseholdMemberRoleCommand(1, 6, HouseholdRoles.Admin, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenInvalidRole_ReturnsBadRequest()
    {
        var result = await CreateHandler().Handle(
            new UpdateHouseholdMemberRoleCommand(1, 6, "Superuser", 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenChangingOwnRole_ReturnsBadRequest()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Owner });

        var result = await CreateHandler().Handle(
            new UpdateHouseholdMemberRoleCommand(1, 5, HouseholdRoles.Admin, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WhenTargetNotFound_ReturnsNotFound()
    {
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Owner });

        var result = await CreateHandler().Handle(
            new UpdateHouseholdMemberRoleCommand(1, 6, HouseholdRoles.Admin, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenOwnerPromotesMemberToAdmin_UpdatesRole()
    {
        var target = new HouseholdMember { HouseholdId = 1, UserId = 6, Role = HouseholdRoles.Member };
        SeedMembers(
            new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Owner },
            target);

        var result = await CreateHandler().Handle(
            new UpdateHouseholdMemberRoleCommand(1, 6, HouseholdRoles.Admin, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(HouseholdRoles.Admin, target.Role);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTransferringOwnership_PromotesTargetAndDemotesOwner()
    {
        var owner = new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Owner };
        var target = new HouseholdMember { HouseholdId = 1, UserId = 6, Role = HouseholdRoles.Member };
        SeedMembers(owner, target);

        var result = await CreateHandler().Handle(
            new UpdateHouseholdMemberRoleCommand(1, 6, HouseholdRoles.Owner, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(HouseholdRoles.Owner, target.Role);
        Assert.Equal(HouseholdRoles.Admin, owner.Role);
    }
}
