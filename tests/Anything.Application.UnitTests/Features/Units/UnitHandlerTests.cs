using Anything.Application.Features.Units.Commands;
using Anything.Application.Features.Units.Queries;
using Anything.Application.Services;
using Anything.Application.UnitTests.Helpers;
using Anything.Contracts.Units;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Units;

public class CreateUnitHandlerTests
{
    private readonly IRepository<MeasurementUnit> _repo = Substitute.For<IRepository<MeasurementUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private CreateUnitHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    public CreateUnitHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 6, 25, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesUnitAndReturnsCreated()
    {
        _repo.Query().Returns(new List<MeasurementUnit>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateUnitCommand("  g  "), TestContext.Current.CancellationToken);

        Assert.IsType<Created<MeasurementUnit>>(result);
        _repo.Received(1).Add(Arg.Is<MeasurementUnit>(u => u.Name == "g"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenDuplicate_ReturnsConflict()
    {
        _repo.Query().Returns(new List<MeasurementUnit> { new() { Id = 1, Name = "g", HouseholdId = 0 } }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new CreateUnitCommand("G"), TestContext.Current.CancellationToken);

        Assert.IsType<Conflict<string>>(result);
        _repo.DidNotReceive().Add(Arg.Any<MeasurementUnit>());
    }
}

public class UpdateUnitHandlerTests
{
    private readonly IRepository<MeasurementUnit> _repo = Substitute.For<IRepository<MeasurementUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private UpdateUnitHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    public UpdateUnitHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 6, 25, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<MeasurementUnit>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new UpdateUnitCommand(1, "g"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 6, 25, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new MeasurementUnit { Id = 1, Name = "gram", HouseholdId = 0 };
        _repo.Query().Returns(new List<MeasurementUnit> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new UpdateUnitCommand(1, " g "), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal("g", entity.Name);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenRenamingToExistingName_ReturnsConflict()
    {
        var entity = new MeasurementUnit { Id = 1, Name = "gram", HouseholdId = 0 };
        var other = new MeasurementUnit { Id = 2, Name = "g", HouseholdId = 0 };
        _repo.Query().Returns(new List<MeasurementUnit> { entity, other }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new UpdateUnitCommand(1, "g"), TestContext.Current.CancellationToken);

        Assert.IsType<Conflict<string>>(result);
        await _unitOfWork.DidNotReceive().SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class DeleteUnitHandlerTests
{
    private readonly IRepository<MeasurementUnit> _repo = Substitute.For<IRepository<MeasurementUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private DeleteUnitHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork);

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.Query().Returns(new List<MeasurementUnit>().AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteUnitCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound<string>>(result);
    }

    [Fact]
    public async Task Handle_RemovesAndReturnsNoContent()
    {
        var entity = new MeasurementUnit { Id = 1, Name = "g", HouseholdId = 0 };
        _repo.Query().Returns(new List<MeasurementUnit> { entity }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new DeleteUnitCommand(1), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _repo.Received(1).Remove(entity);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetUnitsHandlerTests
{
    private readonly IRepository<MeasurementUnit> _repo = Substitute.For<IRepository<MeasurementUnit>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    [Fact]
    public async Task Handle_ReturnsHouseholdUnitsOrdered()
    {
        _repo.Query().Returns(new List<MeasurementUnit>
        {
            new() { Id = 1, Name = "kg", HouseholdId = 0 },
            new() { Id = 2, Name = "g", HouseholdId = 0 },
            new() { Id = 3, Name = "other", HouseholdId = 99 }
        }.AsAsyncQueryable());

        var result = await new GetUnitsHandler(_repo, _householdContext).Handle(new GetUnitsQuery(), TestContext.Current.CancellationToken);

        Assert.Equal(2, result.Count);
        Assert.Equal("g", result[0].Name);
        Assert.Equal("kg", result[1].Name);
    }
}

public class ImportUnitsHandlerTests
{
    private readonly IRepository<MeasurementUnit> _repo = Substitute.For<IRepository<MeasurementUnit>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();

    private ImportUnitsHandler CreateHandler() => new(_repo, _householdContext, _unitOfWork, _timeProvider);

    public ImportUnitsHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 6, 25, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_AddsNewUnitsAndSkipsExisting()
    {
        _repo.Query().Returns(new List<MeasurementUnit> { new() { Id = 1, Name = "g", HouseholdId = 0 } }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new ImportUnitsCommand(
        [
            new UnitImportExportItem("g"),
            new UnitImportExportItem("kg")
        ]), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _repo.Received(1).Add(Arg.Is<MeasurementUnit>(u => u.Name == "kg"));
        _repo.DidNotReceive().Add(Arg.Is<MeasurementUnit>(u => u.Name == "g"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_RemovesUnitsMarkedForDeletion()
    {
        var existing = new MeasurementUnit { Id = 1, Name = "g", HouseholdId = 0 };
        _repo.Query().Returns(new List<MeasurementUnit> { existing }.AsAsyncQueryable());

        var result = await CreateHandler().Handle(new ImportUnitsCommand(
        [
            new UnitImportExportItem("g", Delete: true)
        ]), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        _repo.Received(1).Remove(existing);
    }
}

public class SeedDefaultUnitsHandlerTests
{
    private readonly IUnitCatalog _unitCatalog = Substitute.For<IUnitCatalog>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();

    [Fact]
    public async Task Handle_EnsuresEachDefaultUnitAndSaves()
    {
        var result = await new SeedDefaultUnitsHandler(_unitCatalog, _unitOfWork)
            .Handle(new SeedDefaultUnitsCommand(), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        await _unitCatalog.Received().EnsureUnit("g", Arg.Any<CancellationToken>());
        await _unitCatalog.Received().EnsureUnit("kg", Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class UnitCatalogTests
{
    private readonly IRepository<MeasurementUnit> _repo = Substitute.For<IRepository<MeasurementUnit>>();
    private readonly IHouseholdContext _householdContext = Substitute.For<IHouseholdContext>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    private UnitCatalog CreateCatalog() => new(_repo, _householdContext, _timeProvider);

    public UnitCatalogTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 6, 25, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task EnsureUnit_WhenMissing_AddsUnit()
    {
        _repo.Query().Returns(new List<MeasurementUnit>().AsAsyncQueryable());

        await CreateCatalog().EnsureUnit(" g ", TestContext.Current.CancellationToken);

        _repo.Received(1).Add(Arg.Is<MeasurementUnit>(u => u.Name == "g"));
    }

    [Fact]
    public async Task EnsureUnit_WhenExisting_DoesNotAdd()
    {
        _repo.Query().Returns(new List<MeasurementUnit> { new() { Id = 1, Name = "g", HouseholdId = 0 } }.AsAsyncQueryable());

        await CreateCatalog().EnsureUnit("G", TestContext.Current.CancellationToken);

        _repo.DidNotReceive().Add(Arg.Any<MeasurementUnit>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task EnsureUnit_WhenNullOrEmpty_DoesNotAdd(string? name)
    {
        _repo.Query().Returns(new List<MeasurementUnit>().AsAsyncQueryable());

        await CreateCatalog().EnsureUnit(name, TestContext.Current.CancellationToken);

        _repo.DidNotReceive().Add(Arg.Any<MeasurementUnit>());
    }

    [Fact]
    public async Task EnsureUnit_CalledTwiceInScope_AddsOnce()
    {
        _repo.Query().Returns(new List<MeasurementUnit>().AsAsyncQueryable());
        var catalog = CreateCatalog();

        await catalog.EnsureUnit("g", TestContext.Current.CancellationToken);
        await catalog.EnsureUnit("g", TestContext.Current.CancellationToken);

        _repo.Received(1).Add(Arg.Any<MeasurementUnit>());
    }
}
