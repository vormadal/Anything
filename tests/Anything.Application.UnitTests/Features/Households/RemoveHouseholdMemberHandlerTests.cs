using Anything.Application.Features.Households.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Households;

public class RemoveHouseholdMemberHandlerTests
{
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private RemoveHouseholdMemberHandler CreateHandler() => new(_memberRepo, _unitOfWork);

    private void SeedMembers(params HouseholdMember[] members) =>
        _memberRepo.Query().Returns(members.ToList().AsAsyncQueryable());

    [Fact]
    public async Task Handle_WhenRequesterIsPlainMember_ReturnsForbid()
    {
        SeedMembers(
            new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Member },
            new HouseholdMember { HouseholdId = 1, UserId = 6, Role = HouseholdRoles.Member });

        var result = await CreateHandler().Handle(
            new RemoveHouseholdMemberCommand(1, 6, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenAdminRemovesMember_Succeeds()
    {
        var target = new HouseholdMember { HouseholdId = 1, UserId = 6, Role = HouseholdRoles.Member };
        SeedMembers(
            new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Admin },
            target);

        var result = await CreateHandler().Handle(
            new RemoveHouseholdMemberCommand(1, 6, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _memberRepo.Received(1).Remove(target);
    }

    [Fact]
    public async Task Handle_WhenAdminTriesToRemoveOwner_ReturnsForbid()
    {
        SeedMembers(
            new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Admin },
            new HouseholdMember { HouseholdId = 1, UserId = 6, Role = HouseholdRoles.Owner });

        var result = await CreateHandler().Handle(
            new RemoveHouseholdMemberCommand(1, 6, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }
}
