using Anything.Application.Features.Households.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Households;

public class DeleteHouseholdHandlerTests
{
    private readonly IRepository<Household> _householdRepo = Substitute.For<IRepository<Household>>();
    private readonly IRepository<HouseholdMember> _memberRepo = Substitute.For<IRepository<HouseholdMember>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private DeleteHouseholdHandler CreateHandler() =>
        new(_householdRepo, _memberRepo, _unitOfWork, TimeProvider.System);

    private void SeedHouseholds(params Household[] households) =>
        _householdRepo.Query().Returns(households.ToList().AsAsyncQueryable());

    private void SeedMembers(params HouseholdMember[] members) =>
        _memberRepo.Query().Returns(members.ToList().AsAsyncQueryable());

    [Fact]
    public async Task Handle_WhenHouseholdNotFound_ReturnsNotFound()
    {
        SeedHouseholds();
        SeedMembers();

        var result = await CreateHandler().Handle(
            new DeleteHouseholdCommand(1, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenRequesterIsAdmin_ReturnsForbid()
    {
        SeedHouseholds(new Household { Id = 1, Name = "Test" });
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Admin });

        var result = await CreateHandler().Handle(
            new DeleteHouseholdCommand(1, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenRequesterIsNotMember_ReturnsForbid()
    {
        SeedHouseholds(new Household { Id = 1, Name = "Test" });
        SeedMembers();

        var result = await CreateHandler().Handle(
            new DeleteHouseholdCommand(1, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<ForbidHttpResult>(result);
    }

    [Fact]
    public async Task Handle_WhenRequesterIsOwner_SoftDeletesHousehold()
    {
        var household = new Household { Id = 1, Name = "Test" };
        SeedHouseholds(household);
        SeedMembers(new HouseholdMember { HouseholdId = 1, UserId = 5, Role = HouseholdRoles.Owner });

        var result = await CreateHandler().Handle(
            new DeleteHouseholdCommand(1, 5),
            TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.NotNull(household.DeletedOn);
        _householdRepo.Received(1).Update(household);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
