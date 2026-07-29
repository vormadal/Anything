using Anything.Application.Features.Inventory.Commands;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Inventory;

public class UpdateInventoryItemFieldsHandlerTests
{
    private readonly IRepository<InventoryItem> _itemRepo = Substitute.For<IRepository<InventoryItem>>();
    private readonly IRepository<InventoryItemField> _fieldRepo = Substitute.For<IRepository<InventoryItemField>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private UpdateInventoryItemFieldsHandler CreateHandler() =>
        new(_itemRepo, _fieldRepo, _householdContext, _unitOfWork, _timeProvider);

    public UpdateInventoryItemFieldsHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenItemNotFound_ReturnsNotFound()
    {
        _itemRepo.Query().Returns(new List<InventoryItem>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateInventoryItemFieldsCommand(1, [new InventoryFieldInput("Warranty", "2 years")]),
            TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WithBlankLabel_ReturnsBadRequest()
    {
        _itemRepo.Query().Returns(new List<InventoryItem> { new InventoryItem { Id = 1, Name = "Item" } }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateInventoryItemFieldsCommand(1, [new InventoryFieldInput("  ", "value")]),
            TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
        _fieldRepo.DidNotReceive().AddRange(Arg.Any<IEnumerable<InventoryItemField>>());
    }

    [Fact]
    public async Task Handle_WithOverlongValue_ReturnsBadRequest()
    {
        _itemRepo.Query().Returns(new List<InventoryItem> { new InventoryItem { Id = 1, Name = "Item" } }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateInventoryItemFieldsCommand(1, [new InventoryFieldInput("Label", new string('a', 501))]),
            TestContext.Current.CancellationToken);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_ReplacesExistingFieldsWithTheNewSet()
    {
        _itemRepo.Query().Returns(new List<InventoryItem> { new InventoryItem { Id = 1, Name = "Item" } }.AsAsyncQueryable());
        var oldField = new InventoryItemField { Id = 99, ItemId = 1, Label = "Stale", Value = "old" };
        _fieldRepo.Query().Returns(new List<InventoryItemField> { oldField }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateInventoryItemFieldsCommand(1, [new InventoryFieldInput("Warranty", "2 years"), new InventoryFieldInput("Serial", "ABC123")]),
            TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<IEnumerable<InventoryItemFieldResponse>>>(result);
        var fields = ok.Value!.ToList();
        Assert.Equal(2, fields.Count);
        Assert.Equal("Warranty", fields[0].Label);
        Assert.Equal(0, fields[0].SortOrder);
        Assert.Equal("Serial", fields[1].Label);
        Assert.Equal(1, fields[1].SortOrder);

        _fieldRepo.Received(1).Remove(oldField);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithEmptyList_ClearsAllFields()
    {
        _itemRepo.Query().Returns(new List<InventoryItem> { new InventoryItem { Id = 1, Name = "Item" } }.AsAsyncQueryable());
        var oldField = new InventoryItemField { Id = 99, ItemId = 1, Label = "Stale", Value = "old" };
        _fieldRepo.Query().Returns(new List<InventoryItemField> { oldField }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(
            new UpdateInventoryItemFieldsCommand(1, []), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<Ok<IEnumerable<InventoryItemFieldResponse>>>(result);
        Assert.Empty(ok.Value!);
        _fieldRepo.Received(1).Remove(oldField);
    }
}
