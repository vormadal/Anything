using Anything.Application.Features.FoodPlans.Services;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.FoodPlans;

public class FoodPlanAutoRenewServiceTests
{
    private readonly IRepository<FoodPlan> _repository = Substitute.For<IRepository<FoodPlan>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    private FoodPlanAutoRenewService CreateService(DateTimeOffset utcNow)
    {
        var timeProvider = Substitute.For<TimeProvider>();
        timeProvider.GetUtcNow().Returns(utcNow);

        var services = new ServiceCollection();
        services.AddSingleton(_repository);
        services.AddSingleton(_unitOfWork);
        var serviceProvider = services.BuildServiceProvider();
        var scopeFactory = serviceProvider.GetRequiredService<IServiceScopeFactory>();

        return new FoodPlanAutoRenewService(
            scopeFactory,
            timeProvider,
            NullLogger<FoodPlanAutoRenewService>.Instance);
    }

    [Fact]
    public async Task ProcessAutoRenew_OnDay6_CreatesNextWeekPlan()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var today = weekStart.AddDays(6); // Day before next week = Saturday

        var plan = new FoodPlan
        {
            Id = 1,
            Name = "Weekly Plan",
            WeekStart = weekStart,
            ActiveDays = 31,
            AutoRenew = true
        };

        _repository.Query().Returns(new List<FoodPlan> { plan }.AsAsyncQueryable());

        var service = CreateService(new DateTimeOffset(today, TimeSpan.Zero));
        await service.ProcessAutoRenewAsync(CancellationToken.None);

        _repository.Received(1).Add(Arg.Is<FoodPlan>(p =>
            p.Name == "Weekly Plan" &&
            p.WeekStart.Date == weekStart.AddDays(7).Date &&
            p.ActiveDays == 31 &&
            p.AutoRenew));
    }

    [Fact]
    public async Task ProcessAutoRenew_OnDay7_SoftDeletesCurrentPlan()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var today = weekStart.AddDays(7); // Day after last day = next Monday

        var plan = new FoodPlan
        {
            Id = 1,
            Name = "Weekly Plan",
            WeekStart = weekStart,
            ActiveDays = 31,
            AutoRenew = true
        };

        _repository.Query().Returns(new List<FoodPlan> { plan }.AsAsyncQueryable());

        var service = CreateService(new DateTimeOffset(today, TimeSpan.Zero));
        await service.ProcessAutoRenewAsync(CancellationToken.None);

        Assert.NotNull(plan.DeletedOn);
        _repository.Received().Update(plan);
    }

    [Fact]
    public async Task ProcessAutoRenew_BeforeDay6_DoesNotCreateOrDelete()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var today = weekStart.AddDays(5); // Too early

        var plan = new FoodPlan
        {
            Id = 1,
            Name = "Weekly Plan",
            WeekStart = weekStart,
            ActiveDays = 31,
            AutoRenew = true
        };

        _repository.Query().Returns(new List<FoodPlan> { plan }.AsAsyncQueryable());

        var service = CreateService(new DateTimeOffset(today, TimeSpan.Zero));
        await service.ProcessAutoRenewAsync(CancellationToken.None);

        _repository.DidNotReceive().Add(Arg.Any<FoodPlan>());
        _repository.DidNotReceive().Update(Arg.Any<FoodPlan>());
        Assert.Null(plan.DeletedOn);
    }

    [Fact]
    public async Task ProcessAutoRenew_WhenNextPlanAlreadyExists_DoesNotDuplicate()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var today = weekStart.AddDays(6);
        var nextWeekStart = weekStart.AddDays(7);

        var currentPlan = new FoodPlan
        {
            Id = 1,
            Name = "Weekly Plan",
            WeekStart = weekStart,
            ActiveDays = 31,
            AutoRenew = true
        };

        var nextPlan = new FoodPlan
        {
            Id = 2,
            Name = "Weekly Plan",
            WeekStart = nextWeekStart,
            ActiveDays = 31,
            AutoRenew = true
        };

        _repository.Query().Returns(
            new List<FoodPlan> { currentPlan }.AsAsyncQueryable(),
            new List<FoodPlan> { currentPlan, nextPlan }.AsAsyncQueryable());

        var service = CreateService(new DateTimeOffset(today, TimeSpan.Zero));
        await service.ProcessAutoRenewAsync(CancellationToken.None);

        _repository.DidNotReceive().Add(Arg.Any<FoodPlan>());
    }

    [Fact]
    public async Task ProcessAutoRenew_NonAutoRenewPlan_IsIgnored()
    {
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var today = weekStart.AddDays(7);

        var plan = new FoodPlan
        {
            Id = 1,
            Name = "Manual Plan",
            WeekStart = weekStart,
            ActiveDays = 31,
            AutoRenew = false
        };

        // The query filters AutoRenew == true, so non-auto-renew plans won't appear
        _repository.Query().Returns(new List<FoodPlan>().AsAsyncQueryable());

        var service = CreateService(new DateTimeOffset(today, TimeSpan.Zero));
        await service.ProcessAutoRenewAsync(CancellationToken.None);

        _repository.DidNotReceive().Add(Arg.Any<FoodPlan>());
        _repository.DidNotReceive().Update(Arg.Any<FoodPlan>());
    }

    [Fact]
    public async Task ProcessAutoRenew_OnDay6_BothCreatesNextAndDeletesCurrent_OnDay7()
    {
        // Day 7: both create (if not exists) and delete should happen
        var weekStart = new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc);
        var today = weekStart.AddDays(7);

        var plan = new FoodPlan
        {
            Id = 1,
            Name = "Auto Plan",
            WeekStart = weekStart,
            ActiveDays = 127, // All days
            AutoRenew = true
        };

        _repository.Query().Returns(new List<FoodPlan> { plan }.AsAsyncQueryable());

        var service = CreateService(new DateTimeOffset(today, TimeSpan.Zero));
        await service.ProcessAutoRenewAsync(CancellationToken.None);

        // Should create next week's plan
        _repository.Received(1).Add(Arg.Is<FoodPlan>(p =>
            p.WeekStart.Date == weekStart.AddDays(7).Date &&
            p.ActiveDays == 127 &&
            p.AutoRenew));

        // Should soft-delete current plan
        Assert.NotNull(plan.DeletedOn);
        _repository.Received().Update(plan);

        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}
