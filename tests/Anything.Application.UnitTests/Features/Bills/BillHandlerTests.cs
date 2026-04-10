using Anything.Application.Features.Bills;
using Anything.Application.Features.Bills.Commands;
using Anything.Application.Features.Bills.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Bills;

public class BillHelpersTests
{
    [Theory]
    [InlineData(PaymentFrequency.Weekly, 100, 433.33)]
    [InlineData(PaymentFrequency.BiWeekly, 100, 216.67)]
    [InlineData(PaymentFrequency.Monthly, 100, 100)]
    [InlineData(PaymentFrequency.Quarterly, 300, 100)]
    [InlineData(PaymentFrequency.SemiAnnually, 600, 100)]
    [InlineData(PaymentFrequency.Annually, 1200, 100)]
    public void ComputeMonthlyEquivalent_ReturnsCorrectValue(PaymentFrequency frequency, decimal amount, decimal expected)
    {
        var result = BillHelpers.ComputeMonthlyEquivalent(frequency, amount);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void ComputeMonthlyEquivalent_NullAmount_ReturnsNull()
    {
        var result = BillHelpers.ComputeMonthlyEquivalent(PaymentFrequency.Monthly, null);

        Assert.Null(result);
    }

    [Theory]
    [InlineData("Monthly", true, PaymentFrequency.Monthly)]
    [InlineData("monthly", true, PaymentFrequency.Monthly)]
    [InlineData("WEEKLY", true, PaymentFrequency.Weekly)]
    [InlineData("BiWeekly", true, PaymentFrequency.BiWeekly)]
    [InlineData("Quarterly", true, PaymentFrequency.Quarterly)]
    [InlineData("SemiAnnually", true, PaymentFrequency.SemiAnnually)]
    [InlineData("Annually", true, PaymentFrequency.Annually)]
    public void TryParseFrequency_ValidValues_ReturnsTrue(string value, bool expectedResult, PaymentFrequency expectedFrequency)
    {
        var result = BillHelpers.TryParseFrequency(value, out var frequency);

        Assert.Equal(expectedResult, result);
        Assert.Equal(expectedFrequency, frequency);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("NotAFrequency")]
    [InlineData("")]
    [InlineData("   ")]
    public void TryParseFrequency_InvalidValues_ReturnsFalse(string value)
    {
        var result = BillHelpers.TryParseFrequency(value, out _);

        Assert.False(result);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("123Monthly")]
    public void TryParseFrequency_NumericInput_ReturnsFalse(string value)
    {
        var result = BillHelpers.TryParseFrequency(value, out _);

        Assert.False(result);
    }

    [Fact]
    public void ToBillResponse_MapsAllFieldsCorrectly()
    {
        var now = DateTime.UtcNow;
        var bill = new Bill
        {
            Id = 1,
            Name = "Netflix",
            VendorId = 10,
            Frequency = PaymentFrequency.Monthly,
            IsAutomated = true,
            LocationId = 20,
            ManagementUrl = "https://netflix.com/account",
            Category = "Entertainment",
            Notes = "Family plan",
            CreatedOn = now,
            ModifiedOn = now
        };
        var location = new Location { Id = 20, Name = "Online" };
        var vendor = new Vendor { Id = 10, Name = "Netflix", Website = "https://netflix.com" };
        var priceHistory = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 20m, EffectiveDate = now.AddMonths(-1) },
            new() { Id = 2, BillId = 1, Amount = 25m, EffectiveDate = now }
        };
        var lookup = priceHistory.ToLookup(ph => ph.BillId);
        var locationsById = new Dictionary<int, Location> { { 20, location } };
        var vendorsById = new Dictionary<int, Vendor> { { 10, vendor } };

        var response = BillHelpers.ToBillResponse(bill, lookup, locationsById, vendorsById);

        Assert.Equal(1, response.Id);
        Assert.Equal("Netflix", response.Name);
        Assert.Equal(10, response.VendorId);
        Assert.Equal("Netflix", response.VendorName);
        Assert.Equal("https://netflix.com", response.VendorWebsite);
        Assert.Equal("Monthly", response.Frequency);
        Assert.True(response.IsAutomated);
        Assert.Equal(20, response.LocationId);
        Assert.Equal("Online", response.LocationName);
        Assert.Equal("https://netflix.com/account", response.ManagementUrl);
        Assert.Equal("Entertainment", response.Category);
        Assert.Equal("Family plan", response.Notes);
        Assert.Equal(25m, response.CurrentAmount);
        Assert.Equal(25m, response.MonthlyEquivalent);
        Assert.True(response.PriceIncreased);
        Assert.Equal(now, response.CreatedOn);
        Assert.Equal(now, response.ModifiedOn);
    }

    [Fact]
    public void ToBillResponse_NoPriceHistory_NullCurrentAmount()
    {
        var bill = new Bill { Id = 1, Name = "Gym", Frequency = PaymentFrequency.Monthly, CreatedOn = DateTime.UtcNow };
        var lookup = new List<BillPriceHistory>().ToLookup(ph => ph.BillId);

        var response = BillHelpers.ToBillResponse(bill, lookup, [], []);

        Assert.Null(response.CurrentAmount);
        Assert.Null(response.MonthlyEquivalent);
        Assert.False(response.PriceIncreased);
    }

    [Fact]
    public void ToBillResponse_OnePriceEntry_PriceIncreasedIsFalse()
    {
        var now = DateTime.UtcNow;
        var bill = new Bill { Id = 1, Name = "Gym", Frequency = PaymentFrequency.Monthly, CreatedOn = now };
        var priceHistory = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 50m, EffectiveDate = now }
        };
        var lookup = priceHistory.ToLookup(ph => ph.BillId);

        var response = BillHelpers.ToBillResponse(bill, lookup, [], []);

        Assert.Equal(50m, response.CurrentAmount);
        Assert.False(response.PriceIncreased);
    }

    [Fact]
    public void ToBillResponse_NoVendorOrLocation_ReturnsNullNames()
    {
        var bill = new Bill { Id = 1, Name = "Misc", Frequency = PaymentFrequency.Annually, CreatedOn = DateTime.UtcNow };
        var lookup = new List<BillPriceHistory>().ToLookup(ph => ph.BillId);

        var response = BillHelpers.ToBillResponse(bill, lookup, [], []);

        Assert.Null(response.VendorName);
        Assert.Null(response.VendorWebsite);
        Assert.Null(response.LocationName);
    }
}

public class CreateBillHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly DateTimeOffset _now = new(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public CreateBillHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(_now);
    }

    private CreateBillHandler CreateHandler() =>
        new(_billRepo, _priceRepo, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_InvalidFrequency_ReturnsBadRequest()
    {
        var command = new CreateBillCommand("Netflix", null, "InvalidFreq", true, null, null, null, null, null, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_WithoutInitialPrice_CreatesBillAndSavesOnce()
    {
        var command = new CreateBillCommand("Netflix", null, "Monthly", true, null, null, null, null, null, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        _billRepo.Received(1).Add(Arg.Is<Bill>(b => b.Name == "Netflix" && b.Frequency == PaymentFrequency.Monthly));
        _priceRepo.DidNotReceive().Add(Arg.Any<BillPriceHistory>());
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
        var created = Assert.IsType<Created<BillResponse>>(result);
        Assert.Equal("Netflix", created.Value!.Name);
    }

    [Fact]
    public async Task Handle_WithInitialPrice_CreatesBillAndPriceInSingleSave()
    {
        var effectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var command = new CreateBillCommand("Netflix", null, "Monthly", true, null, null, null, null, 15.99m, effectiveDate);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        _billRepo.Received(1).Add(Arg.Any<Bill>());
        _priceRepo.Received(1).Add(Arg.Is<BillPriceHistory>(ph =>
            ph.Amount == 15.99m && ph.Bill != null));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithInitialPriceNoDate_UsesNowAsEffectiveDate()
    {
        var command = new CreateBillCommand("Netflix", null, "Monthly", true, null, null, null, null, 15.99m, null);

        await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        _priceRepo.Received(1).Add(Arg.Is<BillPriceHistory>(ph =>
            ph.EffectiveDate == _now.UtcDateTime));
    }

    [Fact]
    public async Task Handle_SetsCreatedOnTimestamp()
    {
        var command = new CreateBillCommand("Netflix", null, "Annually", false, null, null, null, null, null, null);

        await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        _billRepo.Received(1).Add(Arg.Is<Bill>(b => b.CreatedOn == _now.UtcDateTime));
    }
}

public class UpdateBillHandlerTests
{
    private readonly IRepository<Bill> _repo = Substitute.For<IRepository<Bill>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly DateTimeOffset _now = new(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateBillHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(_now);
    }

    private UpdateBillHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_InvalidFrequency_ReturnsBadRequest()
    {
        var command = new UpdateBillCommand(1, "Netflix", null, "BadFreq", false, null, null, null, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_BillNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Bill?)null);
        var command = new UpdateBillCommand(1, "Netflix", null, "Monthly", false, null, null, null, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_BillDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Bill { Id = 1, Name = "Netflix", DeletedOn = DateTime.UtcNow });
        var command = new UpdateBillCommand(1, "Netflix", null, "Monthly", false, null, null, null, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_ValidUpdate_UpdatesFieldsAndReturnsNoContent()
    {
        var bill = new Bill { Id = 1, Name = "Old", Frequency = PaymentFrequency.Monthly };
        _repo.GetById(1).Returns(bill);
        var command = new UpdateBillCommand(1, "New Name", 5, "Weekly", true, 10, "https://manage.example.com", "Utilities", "Note");

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Name", bill.Name);
        Assert.Equal(5, bill.VendorId);
        Assert.Equal(PaymentFrequency.Weekly, bill.Frequency);
        Assert.True(bill.IsAutomated);
        Assert.Equal(10, bill.LocationId);
        Assert.Equal("https://manage.example.com", bill.ManagementUrl);
        Assert.Equal("Utilities", bill.Category);
        Assert.Equal("Note", bill.Notes);
        Assert.Equal(_now.UtcDateTime, bill.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteBillHandlerTests
{
    private readonly IRepository<Bill> _repo = Substitute.For<IRepository<Bill>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly DateTimeOffset _now = new(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public DeleteBillHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(_now);
    }

    private DeleteBillHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_BillNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Bill?)null);

        var result = await CreateHandler().Handle(new DeleteBillCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_BillAlreadyDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Bill { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });

        var result = await CreateHandler().Handle(new DeleteBillCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_ValidBill_SetsDeletedOnAndReturnsNoContent()
    {
        var bill = new Bill { Id = 1, Name = "Netflix" };
        _repo.GetById(1).Returns(bill);

        var result = await CreateHandler().Handle(new DeleteBillCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(_now.UtcDateTime, bill.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class AddBillPriceHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly DateTimeOffset _now = new(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public AddBillPriceHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(_now);
    }

    private AddBillPriceHandler CreateHandler() => new(_billRepo, _priceRepo, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_BillNotFound_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns((Bill?)null);
        var command = new AddBillPriceCommand(1, 50m, DateTime.UtcNow, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_BillDeleted_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var command = new AddBillPriceCommand(1, 50m, DateTime.UtcNow, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_ValidBill_AddsPriceEntryAndSaves()
    {
        var bill = new Bill { Id = 1, Name = "Netflix" };
        _billRepo.GetById(1).Returns(bill);
        var effectiveDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var command = new AddBillPriceCommand(1, 19.99m, effectiveDate, "Price increase");

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        _priceRepo.Received(1).Add(Arg.Is<BillPriceHistory>(ph =>
            ph.BillId == 1 && ph.Amount == 19.99m && ph.Notes == "Price increase"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
        Assert.IsType<Created<BillPriceHistory>>(result);
    }

    [Fact]
    public async Task Handle_ValidBill_SetsCreatedOnTimestamp()
    {
        var bill = new Bill { Id = 1, Name = "Netflix" };
        _billRepo.GetById(1).Returns(bill);
        var command = new AddBillPriceCommand(1, 10m, DateTime.UtcNow, null);

        await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        _priceRepo.Received(1).Add(Arg.Is<BillPriceHistory>(ph => ph.CreatedOn == _now.UtcDateTime));
    }
}

public class UpdateBillPriceHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly DateTimeOffset _now = new(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    public UpdateBillPriceHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(_now);
    }

    private UpdateBillPriceHandler CreateHandler() => new(_billRepo, _priceRepo, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_EntryNotFound_ReturnsNotFound()
    {
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());
        var command = new UpdateBillPriceCommand(1, 99, 25m, DateTime.UtcNow, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WrongBillId_ReturnsNotFound()
    {
        var entry = new BillPriceHistory { Id = 5, BillId = 2, Amount = 10m, EffectiveDate = DateTime.UtcNow };
        _priceRepo.Query().Returns(new List<BillPriceHistory> { entry }.AsAsyncQueryable());
        var command = new UpdateBillPriceCommand(1, 5, 25m, DateTime.UtcNow, null);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_ValidEntry_UpdatesFieldsAndReturnsNoContent()
    {
        var entry = new BillPriceHistory { Id = 5, BillId = 1, Amount = 10m, EffectiveDate = DateTime.UtcNow };
        _priceRepo.Query().Returns(new List<BillPriceHistory> { entry }.AsAsyncQueryable());
        var newDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc);
        var command = new UpdateBillPriceCommand(1, 5, 25m, newDate, "Updated note");

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(25m, entry.Amount);
        Assert.Equal(newDate, entry.EffectiveDate);
        Assert.Equal("Updated note", entry.Notes);
        Assert.Equal(_now.UtcDateTime, entry.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteBillPriceHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private DeleteBillPriceHandler CreateHandler() => new(_billRepo, _priceRepo, _householdContext, _unitOfWork);

    [Fact]
    public async Task Handle_EntryNotFound_ReturnsNotFound()
    {
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());
        var command = new DeleteBillPriceCommand(1, 99);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WrongBillId_ReturnsNotFound()
    {
        var entry = new BillPriceHistory { Id = 5, BillId = 2, Amount = 10m, EffectiveDate = DateTime.UtcNow };
        _priceRepo.Query().Returns(new List<BillPriceHistory> { entry }.AsAsyncQueryable());
        var command = new DeleteBillPriceCommand(1, 5);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_ValidEntry_RemovesEntryAndReturnsNoContent()
    {
        var entry = new BillPriceHistory { Id = 5, BillId = 1, Amount = 10m, EffectiveDate = DateTime.UtcNow };
        _priceRepo.Query().Returns(new List<BillPriceHistory> { entry }.AsAsyncQueryable());
        var command = new DeleteBillPriceCommand(1, 5);

        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _priceRepo.Received(1).Remove(entry);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetBillsHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IRepository<Location> _locationRepo = Substitute.For<IRepository<Location>>();
    private readonly IRepository<Vendor> _vendorRepo = Substitute.For<IRepository<Vendor>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private GetBillsHandler CreateHandler() => new(_billRepo, _priceRepo, _locationRepo, _vendorRepo, _householdContext);

    [Fact]
    public async Task Handle_NoBills_ReturnsEmptyList()
    {
        _billRepo.Query().Returns(new List<Bill>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillsQuery(), TestContext.Current.CancellationToken);

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_DeletedBillsExcluded_ReturnsOnlyActive()
    {
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Active", Frequency = PaymentFrequency.Monthly },
            new() { Id = 2, Name = "Deleted", Frequency = PaymentFrequency.Monthly, DeletedOn = DateTime.UtcNow }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Active", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsMappedBillResponses()
    {
        var now = DateTime.UtcNow;
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Netflix", Frequency = PaymentFrequency.Monthly, CreatedOn = now }
        };
        var priceHistories = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 15m, EffectiveDate = now }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());
        _priceRepo.Query().Returns(priceHistories.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillsQuery(), TestContext.Current.CancellationToken);

        Assert.Single(result);
        Assert.Equal("Netflix", result[0].Name);
        Assert.Equal(15m, result[0].CurrentAmount);
        Assert.Equal("Monthly", result[0].Frequency);
    }

    [Fact]
    public async Task Handle_ReturnsBillsOrderedByName()
    {
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Zzz Service", Frequency = PaymentFrequency.Monthly, CreatedOn = DateTime.UtcNow },
            new() { Id = 2, Name = "Aaa Service", Frequency = PaymentFrequency.Monthly, CreatedOn = DateTime.UtcNow }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillsQuery(), TestContext.Current.CancellationToken);

        Assert.Equal("Aaa Service", result[0].Name);
        Assert.Equal("Zzz Service", result[1].Name);
    }

    [Fact]
    public async Task Handle_WithVendorAndLocation_MapsNamesCorrectly()
    {
        var now = DateTime.UtcNow;
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Bill", Frequency = PaymentFrequency.Monthly, VendorId = 10, LocationId = 20, CreatedOn = now }
        };
        var locations = new List<Location> { new() { Id = 20, Name = "Store" } };
        var vendors = new List<Vendor> { new() { Id = 10, Name = "Acme", Website = "https://acme.com" } };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());
        _locationRepo.Query().Returns(locations.AsAsyncQueryable());
        _vendorRepo.Query().Returns(vendors.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillsQuery(), TestContext.Current.CancellationToken);

        Assert.Equal("Store", result[0].LocationName);
        Assert.Equal("Acme", result[0].VendorName);
        Assert.Equal("https://acme.com", result[0].VendorWebsite);
    }
}

public class GetBillByIdHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IRepository<Location> _locationRepo = Substitute.For<IRepository<Location>>();
    private readonly IRepository<Vendor> _vendorRepo = Substitute.For<IRepository<Vendor>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private GetBillByIdHandler CreateHandler() => new(_billRepo, _priceRepo, _locationRepo, _vendorRepo, _householdContext);

    [Fact]
    public async Task Handle_BillNotFound_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns((Bill?)null);

        var result = await CreateHandler().Handle(new GetBillByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_BillDeleted_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });

        var result = await CreateHandler().Handle(new GetBillByIdQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_BillFound_ReturnsMappedBillResponse()
    {
        var now = DateTime.UtcNow;
        var bill = new Bill { Id = 1, Name = "Netflix", Frequency = PaymentFrequency.Monthly, CreatedOn = now };
        _billRepo.GetById(1).Returns(bill);
        var priceHistories = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 15m, EffectiveDate = now }
        };
        _priceRepo.Query().Returns(priceHistories.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillByIdQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<BillResponse>>(result);
        Assert.Equal("Netflix", ok.Value!.Name);
        Assert.Equal(15m, ok.Value.CurrentAmount);
    }

    [Fact]
    public async Task Handle_BillWithNoLocation_DoesNotQueryLocationRepo()
    {
        var bill = new Bill { Id = 1, Name = "Netflix", Frequency = PaymentFrequency.Monthly };
        _billRepo.GetById(1).Returns(bill);
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());

        await CreateHandler().Handle(new GetBillByIdQuery(1), TestContext.Current.CancellationToken);

        _locationRepo.DidNotReceive().Query();
    }

    [Fact]
    public async Task Handle_BillWithNoVendor_DoesNotQueryVendorRepo()
    {
        var bill = new Bill { Id = 1, Name = "Netflix", Frequency = PaymentFrequency.Monthly };
        _billRepo.GetById(1).Returns(bill);
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());

        await CreateHandler().Handle(new GetBillByIdQuery(1), TestContext.Current.CancellationToken);

        _vendorRepo.DidNotReceive().Query();
    }
}

public class GetBillSummaryHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private GetBillSummaryHandler CreateHandler() => new(_billRepo, _priceRepo, _householdContext);

    [Fact]
    public async Task Handle_NoBills_ReturnsZeroSummary()
    {
        _billRepo.Query().Returns(new List<Bill>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(0, result.TotalBills);
        Assert.Equal(0m, result.TotalMonthlyEquivalent);
        Assert.Equal(0, result.AutomatedCount);
        Assert.Equal(0, result.ManualCount);
    }

    [Fact]
    public async Task Handle_ComputesCorrectTotals()
    {
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Monthly Bill", Frequency = PaymentFrequency.Monthly, IsAutomated = true },
            new() { Id = 2, Name = "Annual Bill", Frequency = PaymentFrequency.Annually, IsAutomated = false }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());

        // Monthly bill: 100/month, Annual bill: 1200/year = 100/month => total = 200
        var priceData = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 100m, EffectiveDate = DateTime.UtcNow },
            new() { Id = 2, BillId = 2, Amount = 1200m, EffectiveDate = DateTime.UtcNow }
        };
        _priceRepo.Query().Returns(priceData.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.TotalBills);
        Assert.Equal(200m, result.TotalMonthlyEquivalent);
        Assert.Equal(1, result.AutomatedCount);
        Assert.Equal(1, result.ManualCount);
    }

    [Fact]
    public async Task Handle_BillWithNoPrice_TreatsAmountAsZero()
    {
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "No Price", Frequency = PaymentFrequency.Monthly, IsAutomated = false }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(1, result.TotalBills);
        Assert.Equal(0m, result.TotalMonthlyEquivalent);
    }

    [Fact]
    public async Task Handle_UsesLatestPriceForEachBill()
    {
        var now = DateTime.UtcNow;
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Bill", Frequency = PaymentFrequency.Monthly, IsAutomated = true }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());

        var priceData = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 10m, EffectiveDate = now.AddMonths(-2) },
            new() { Id = 2, BillId = 1, Amount = 20m, EffectiveDate = now }
        };
        _priceRepo.Query().Returns(priceData.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(20m, result.TotalMonthlyEquivalent);
    }

    [Fact]
    public async Task Handle_DeletedBillsExcluded()
    {
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Active", Frequency = PaymentFrequency.Monthly, IsAutomated = true },
            new() { Id = 2, Name = "Deleted", Frequency = PaymentFrequency.Monthly, IsAutomated = false, DeletedOn = DateTime.UtcNow }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(1, result.TotalBills);
        Assert.Equal(1, result.AutomatedCount);
        Assert.Equal(0, result.ManualCount);
    }
}

public class GetBillPriceHistoryHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private GetBillPriceHistoryHandler CreateHandler() => new(_billRepo, _priceRepo, _householdContext);

    [Fact]
    public async Task Handle_BillNotFound_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns((Bill?)null);

        var result = await CreateHandler().Handle(new GetBillPriceHistoryQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_BillDeleted_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });

        var result = await CreateHandler().Handle(new GetBillPriceHistoryQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_ValidBill_ReturnsOrderedHistory()
    {
        var now = DateTime.UtcNow;
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Netflix" });
        var entries = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 10m, EffectiveDate = now.AddMonths(-2), CreatedOn = now.AddMonths(-2) },
            new() { Id = 2, BillId = 1, Amount = 15m, EffectiveDate = now.AddMonths(-1), CreatedOn = now.AddMonths(-1) },
            new() { Id = 3, BillId = 1, Amount = 20m, EffectiveDate = now, CreatedOn = now }
        };
        _priceRepo.Query().Returns(entries.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillPriceHistoryQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<BillPriceHistoryResponse>>>(result);
        var list = ok.Value!;
        Assert.Equal(3, list.Count);
        // Ordered descending by EffectiveDate
        Assert.Equal(20m, list[0].Amount);
        Assert.Equal(15m, list[1].Amount);
        Assert.Equal(10m, list[2].Amount);
    }

    [Fact]
    public async Task Handle_SetsCorrectPreviousAmount()
    {
        var now = DateTime.UtcNow;
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Netflix" });
        var entries = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 10m, EffectiveDate = now.AddMonths(-1), CreatedOn = now.AddMonths(-1) },
            new() { Id = 2, BillId = 1, Amount = 20m, EffectiveDate = now, CreatedOn = now }
        };
        _priceRepo.Query().Returns(entries.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillPriceHistoryQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<BillPriceHistoryResponse>>>(result);
        var list = ok.Value!;
        // Most recent entry (20m) has previous of 10m
        Assert.Equal(10m, list[0].PreviousAmount);
        // Oldest entry has no previous
        Assert.Null(list[1].PreviousAmount);
    }

    [Fact]
    public async Task Handle_EmptyHistory_ReturnsEmptyList()
    {
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Netflix" });
        _priceRepo.Query().Returns(new List<BillPriceHistory>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillPriceHistoryQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<BillPriceHistoryResponse>>>(result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task Handle_SingleEntry_NullPreviousAmount()
    {
        var now = DateTime.UtcNow;
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Netflix" });
        var entries = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 15m, EffectiveDate = now, CreatedOn = now }
        };
        _priceRepo.Query().Returns(entries.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillPriceHistoryQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<List<BillPriceHistoryResponse>>>(result);
        Assert.Null(ok.Value![0].PreviousAmount);
    }
}

public class BillHelpers_NoneFrequencyTests
{
    [Fact]
    public void ComputeMonthlyEquivalent_NoneFrequency_ReturnsNull()
    {
        var result = BillHelpers.ComputeMonthlyEquivalent(PaymentFrequency.None, 500m);

        Assert.Null(result);
    }

    [Theory]
    [InlineData("None", true, PaymentFrequency.None)]
    [InlineData("none", true, PaymentFrequency.None)]
    [InlineData("NONE", true, PaymentFrequency.None)]
    public void TryParseFrequency_NoneVariants_ReturnsTrue(string value, bool expectedResult, PaymentFrequency expectedFrequency)
    {
        var result = BillHelpers.TryParseFrequency(value, out var frequency);

        Assert.Equal(expectedResult, result);
        Assert.Equal(expectedFrequency, frequency);
    }
}

public class GetBillSummaryHandler_NoneFrequencyTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillPriceHistory> _priceRepo = Substitute.For<IRepository<BillPriceHistory>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private GetBillSummaryHandler CreateHandler() => new(_billRepo, _priceRepo, _householdContext);

    [Fact]
    public async Task Handle_NoneFrequencyBill_ExcludedFromMonthlyEquivalent()
    {
        var now = DateTime.UtcNow;
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "One-time expense", Frequency = PaymentFrequency.None, IsAutomated = false },
            new() { Id = 2, Name = "Monthly Bill", Frequency = PaymentFrequency.Monthly, IsAutomated = true }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());

        var priceData = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 500m, EffectiveDate = now },
            new() { Id = 2, BillId = 2, Amount = 100m, EffectiveDate = now }
        };
        _priceRepo.Query().Returns(priceData.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        // None frequency bill (500) has no monthly equivalent; only Monthly bill (100) counts
        Assert.Equal(100m, result.TotalMonthlyEquivalent);
        Assert.Equal(2, result.TotalBills);
    }

    [Fact]
    public async Task Handle_ReturnsCurrentMonthAndYearAmounts()
    {
        var now = DateTime.UtcNow;
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Bill A", Frequency = PaymentFrequency.Monthly, IsAutomated = true }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());

        var priceData = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 100m, EffectiveDate = now }
        };
        _priceRepo.Query().Returns(priceData.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(100m, result.TotalCurrentMonthAmount);
        Assert.Equal(100m, result.TotalCurrentYearAmount);
    }

    [Fact]
    public async Task Handle_OldPriceEntryNotInCurrentMonth_ZeroCurrentMonth()
    {
        var now = DateTime.UtcNow;
        var bills = new List<Bill>
        {
            new() { Id = 1, Name = "Bill A", Frequency = PaymentFrequency.Monthly, IsAutomated = true }
        };
        _billRepo.Query().Returns(bills.AsAsyncQueryable());

        var priceData = new List<BillPriceHistory>
        {
            new() { Id = 1, BillId = 1, Amount = 100m, EffectiveDate = now.AddMonths(-2) }
        };
        _priceRepo.Query().Returns(priceData.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(0m, result.TotalCurrentMonthAmount);
    }

    [Fact]
    public async Task Handle_NoBills_ZeroCurrentMonthAndYear()
    {
        _billRepo.Query().Returns(new List<Bill>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillSummaryQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(0m, result.TotalCurrentMonthAmount);
        Assert.Equal(0m, result.TotalCurrentYearAmount);
    }
}

public class UploadBillAttachmentHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillAttachment> _attachmentRepo = Substitute.For<IRepository<BillAttachment>>();
    private readonly IImageStorageService _storageService = Substitute.For<IImageStorageService>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private UploadBillAttachmentHandler CreateHandler() =>
        new(_billRepo, _attachmentRepo, _storageService, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_BillNotFound_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns((Bill?)null);

        var command = new UploadBillAttachmentCommand(1, Stream.Null, "file.pdf", "application/pdf", 100);
        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_EmptyFile_ReturnsBadRequest()
    {
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Test" });

        var command = new UploadBillAttachmentCommand(1, Stream.Null, "file.pdf", "application/pdf", 0);
        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_ValidUpload_ReturnsCreated()
    {
        var now = DateTime.UtcNow;
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Test" });
        _storageService.Upload(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<long>(), Arg.Any<CancellationToken>(), Arg.Any<string>())
            .Returns("bills/test.pdf");
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(now));

        var command = new UploadBillAttachmentCommand(1, new MemoryStream(new byte[10]), "invoice.pdf", "application/pdf", 10);
        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<Created>(result);
        _attachmentRepo.Received(1).Add(Arg.Is<BillAttachment>(a =>
            a.BillId == 1 &&
            a.Name == "invoice" &&
            a.ContentType == "application/pdf"));
    }

    [Fact]
    public async Task Handle_CustomAttachmentName_UsesProvidedName()
    {
        var now = DateTime.UtcNow;
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Test" });
        _storageService.Upload(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<long>(), Arg.Any<CancellationToken>(), Arg.Any<string>())
            .Returns("bills/test.pdf");
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(now));

        var command = new UploadBillAttachmentCommand(1, new MemoryStream(new byte[10]), "invoice.pdf", "application/pdf", 10, AttachmentName: "My Receipt");
        var result = await CreateHandler().Handle(command, TestContext.Current.CancellationToken);

        Assert.IsType<Created>(result);
        _attachmentRepo.Received(1).Add(Arg.Is<BillAttachment>(a => a.Name == "My Receipt"));
    }
}

public class DeleteBillAttachmentHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillAttachment> _attachmentRepo = Substitute.For<IRepository<BillAttachment>>();
    private readonly IImageStorageService _storageService = Substitute.For<IImageStorageService>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private DeleteBillAttachmentHandler CreateHandler() =>
        new(_billRepo, _attachmentRepo, _storageService, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_AttachmentNotFound_ReturnsNotFound()
    {
        _attachmentRepo.GetById(1).Returns((BillAttachment?)null);

        var result = await CreateHandler().Handle(new DeleteBillAttachmentCommand(1, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_AttachmentBelongsToDifferentBill_ReturnsNotFound()
    {
        _attachmentRepo.GetById(1).Returns(new BillAttachment
        {
            Id = 1, BillId = 99, StorageKey = "bills/file.pdf", Name = "File", ContentType = "application/pdf", CreatedOn = DateTime.UtcNow
        });

        var result = await CreateHandler().Handle(new DeleteBillAttachmentCommand(1, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_ValidAttachment_DeletesAndReturnsNoContent()
    {
        var now = DateTime.UtcNow;
        var attachment = new BillAttachment
        {
            Id = 1, BillId = 1, StorageKey = "bills/file.pdf", Name = "File", ContentType = "application/pdf", CreatedOn = now
        };
        _attachmentRepo.GetById(1).Returns(attachment);
        _storageService.Delete(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(now));

        var result = await CreateHandler().Handle(new DeleteBillAttachmentCommand(1, 1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.NotNull(attachment.DeletedOn);
        await _storageService.Received(1).Delete("bills/file.pdf", Arg.Any<CancellationToken>());
    }
}

public class UpdateBillAttachmentHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillAttachment> _attachmentRepo = Substitute.For<IRepository<BillAttachment>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private UpdateBillAttachmentHandler CreateHandler() =>
        new(_billRepo, _attachmentRepo, _householdContext, _unitOfWork, _timeProvider);

    [Fact]
    public async Task Handle_AttachmentNotFound_ReturnsNotFound()
    {
        _attachmentRepo.GetById(1).Returns((BillAttachment?)null);

        var result = await CreateHandler().Handle(new UpdateBillAttachmentCommand(1, 1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_ValidUpdate_UpdatesNameAndReturnsNoContent()
    {
        var now = DateTime.UtcNow;
        var attachment = new BillAttachment
        {
            Id = 1, BillId = 1, StorageKey = "bills/file.pdf", Name = "Old Name", ContentType = "application/pdf", CreatedOn = now
        };
        _attachmentRepo.GetById(1).Returns(attachment);
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(now));

        var result = await CreateHandler().Handle(new UpdateBillAttachmentCommand(1, 1, "New Name"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Name", attachment.Name);
        Assert.NotNull(attachment.ModifiedOn);
    }
}

public class GetBillAttachmentsHandlerTests
{
    private readonly IRepository<Bill> _billRepo = Substitute.For<IRepository<Bill>>();
    private readonly IRepository<BillAttachment> _attachmentRepo = Substitute.For<IRepository<BillAttachment>>();
    private readonly IImageStorageService _storageService = Substitute.For<IImageStorageService>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private GetBillAttachmentsHandler CreateHandler() =>
        new(_billRepo, _attachmentRepo, _storageService, _householdContext);

    [Fact]
    public async Task Handle_BillNotFound_ReturnsNotFound()
    {
        _billRepo.GetById(1).Returns((Bill?)null);

        var result = await CreateHandler().Handle(new GetBillAttachmentsQuery(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_ImageAttachment_UsesThumbnailUrl()
    {
        var now = DateTime.UtcNow;
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Test" });
        var attachments = new List<BillAttachment>
        {
            new() { Id = 1, BillId = 1, StorageKey = "bills/img.jpg", Name = "Photo", ContentType = "image/jpeg", CreatedOn = now }
        };
        _attachmentRepo.Query().Returns(attachments.AsAsyncQueryable());
        _storageService.GetImageUrl("bills/img.jpg", 150, 150, "fill").Returns("http://proxy/thumb.jpg");
        _storageService.GetImageUrl("bills/img.jpg", 1920, 1080, "fit").Returns("http://proxy/full.jpg");

        var result = await CreateHandler().Handle(new GetBillAttachmentsQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<IEnumerable<BillAttachmentResponse>>>(result);
        var list = ok.Value!.ToList();
        Assert.Single(list);
        Assert.Equal("http://proxy/thumb.jpg", list[0].ThumbnailUrl);
        Assert.Equal("http://proxy/full.jpg", list[0].Url);
    }

    [Fact]
    public async Task Handle_NonImageAttachment_NullThumbnailUrl()
    {
        var now = DateTime.UtcNow;
        _billRepo.GetById(1).Returns(new Bill { Id = 1, Name = "Test" });
        var attachments = new List<BillAttachment>
        {
            new() { Id = 1, BillId = 1, StorageKey = "bills/doc.pdf", Name = "Invoice", ContentType = "application/pdf", CreatedOn = now }
        };
        _attachmentRepo.Query().Returns(attachments.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new GetBillAttachmentsQuery(1), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<IEnumerable<BillAttachmentResponse>>>(result);
        var list = ok.Value!.ToList();
        Assert.Single(list);
        Assert.Null(list[0].ThumbnailUrl);
        Assert.Equal("/api/bills/1/attachments/1/download", list[0].Url);
    }
}
