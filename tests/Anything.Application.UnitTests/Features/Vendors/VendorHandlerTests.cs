using Anything.Application.Features.Vendors.Commands;
using Anything.Application.Features.Vendors.Queries;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Vendors;

public class CreateVendorHandlerTests
{
    private readonly IRepository<Vendor> _repo = Substitute.For<IRepository<Vendor>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public CreateVendorHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_CreatesEntityWithNameAndWebsite()
    {
        var handler = new CreateVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateVendorCommand("Acme Corp", "https://acme.com"));

        Assert.Equal("Acme Corp", result.Name);
        Assert.Equal("https://acme.com", result.Website);
        _repo.Received(1).Add(Arg.Is<Vendor>(v => v.Name == "Acme Corp" && v.Website == "https://acme.com"));
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_CreatesEntityWithNullWebsite()
    {
        var handler = new CreateVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateVendorCommand("No-Web Vendor", null));

        Assert.Equal("No-Web Vendor", result.Name);
        Assert.Null(result.Website);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SetsCreatedOnToNow()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var handler = new CreateVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateVendorCommand("Supplier Z", null));

        Assert.Equal(now.UtcDateTime, result.CreatedOn);
    }

    [Fact]
    public async Task Handle_ReturnsCreatedVendor()
    {
        var handler = new CreateVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new CreateVendorCommand("Tech Shop", "https://techshop.io"));

        Assert.IsType<Vendor>(result);
        Assert.Equal("Tech Shop", result.Name);
    }
}

public class UpdateVendorHandlerTests
{
    private readonly IRepository<Vendor> _repo = Substitute.For<IRepository<Vendor>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public UpdateVendorHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Vendor?)null);
        var handler = new UpdateVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateVendorCommand(1, "New Name", null));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Vendor { Id = 1, Name = "Old", DeletedOn = DateTime.UtcNow });
        var handler = new UpdateVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateVendorCommand(1, "New Name", null));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_UpdatesNameWebsiteAndModifiedOn()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Vendor { Id = 1, Name = "Old Name", Website = "https://old.com" };
        _repo.GetById(1).Returns(entity);
        var handler = new UpdateVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new UpdateVendorCommand(1, "New Name", "https://new.com"));

        Assert.IsType<NoContent>(result);
        Assert.Equal("New Name", entity.Name);
        Assert.Equal("https://new.com", entity.Website);
        Assert.Equal(now.UtcDateTime, entity.ModifiedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_CanClearWebsite()
    {
        var entity = new Vendor { Id = 1, Name = "Vendor", Website = "https://old.com" };
        _repo.GetById(1).Returns(entity);
        var handler = new UpdateVendorHandler(_repo, _unitOfWork, _timeProvider);

        await handler.Handle(new UpdateVendorCommand(1, "Vendor", null));

        Assert.Null(entity.Website);
    }
}

public class DeleteVendorHandlerTests
{
    private readonly IRepository<Vendor> _repo = Substitute.For<IRepository<Vendor>>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly TimeProvider _timeProvider = Substitute.For<TimeProvider>();

    public DeleteVendorHandlerTests()
    {
        _timeProvider.GetUtcNow().Returns(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Vendor?)null);
        var handler = new DeleteVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteVendorCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenAlreadyDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Vendor { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var handler = new DeleteVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteVendorCommand(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_SetsDeletedOnAndReturnsNoContent()
    {
        var now = new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero);
        _timeProvider.GetUtcNow().Returns(now);
        var entity = new Vendor { Id = 1, Name = "X" };
        _repo.GetById(1).Returns(entity);
        var handler = new DeleteVendorHandler(_repo, _unitOfWork, _timeProvider);

        var result = await handler.Handle(new DeleteVendorCommand(1));

        Assert.IsType<NoContent>(result);
        Assert.Equal(now.UtcDateTime, entity.DeletedOn);
        await _unitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DoesNotSaveChanges_WhenNotFound()
    {
        _repo.GetById(99).Returns((Vendor?)null);
        var handler = new DeleteVendorHandler(_repo, _unitOfWork, _timeProvider);

        await handler.Handle(new DeleteVendorCommand(99));

        await _unitOfWork.DidNotReceive().SaveChanges(Arg.Any<CancellationToken>());
    }
}

public class GetVendorsHandlerTests
{
    private readonly IRepository<Vendor> _repo = Substitute.For<IRepository<Vendor>>();

    [Fact]
    public async Task Handle_ReturnsOnlyNonDeletedItems()
    {
        _repo.Query().Returns(new List<Vendor>
        {
            new() { Id = 1, Name = "Active Vendor" },
            new() { Id = 2, Name = "Deleted Vendor", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var handler = new GetVendorsHandler(_repo);
        var result = await handler.Handle(new GetVendorsQuery());

        Assert.Single(result);
        Assert.Equal("Active Vendor", result[0].Name);
    }

    [Fact]
    public async Task Handle_ReturnsEmptyList_WhenAllDeleted()
    {
        _repo.Query().Returns(new List<Vendor>
        {
            new() { Id = 1, Name = "Gone", DeletedOn = DateTime.UtcNow }
        }.AsAsyncQueryable());

        var handler = new GetVendorsHandler(_repo);
        var result = await handler.Handle(new GetVendorsQuery());

        Assert.Empty(result);
    }

    [Fact]
    public async Task Handle_ReturnsItemsOrderedByName()
    {
        _repo.Query().Returns(new List<Vendor>
        {
            new() { Id = 1, Name = "Zebra Corp" },
            new() { Id = 2, Name = "Alpha Inc" },
            new() { Id = 3, Name = "Mango Ltd" }
        }.AsAsyncQueryable());

        var handler = new GetVendorsHandler(_repo);
        var result = await handler.Handle(new GetVendorsQuery());

        Assert.Equal(["Alpha Inc", "Mango Ltd", "Zebra Corp"], result.Select(v => v.Name).ToList());
    }
}

public class GetVendorByIdHandlerTests
{
    private readonly IRepository<Vendor> _repo = Substitute.For<IRepository<Vendor>>();

    [Fact]
    public async Task Handle_WhenNotFound_ReturnsNotFound()
    {
        _repo.GetById(1).Returns((Vendor?)null);
        var handler = new GetVendorByIdHandler(_repo);

        var result = await handler.Handle(new GetVendorByIdQuery(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenDeleted_ReturnsNotFound()
    {
        _repo.GetById(1).Returns(new Vendor { Id = 1, Name = "X", DeletedOn = DateTime.UtcNow });
        var handler = new GetVendorByIdHandler(_repo);

        var result = await handler.Handle(new GetVendorByIdQuery(1));

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsOkWithEntity()
    {
        var entity = new Vendor { Id = 1, Name = "Best Vendor", Website = "https://best.com" };
        _repo.GetById(1).Returns(entity);
        var handler = new GetVendorByIdHandler(_repo);

        var result = await handler.Handle(new GetVendorByIdQuery(1));

        var ok = Assert.IsType<Ok<Vendor>>(result);
        Assert.Equal("Best Vendor", ok.Value!.Name);
        Assert.Equal("https://best.com", ok.Value.Website);
    }

    [Fact]
    public async Task Handle_WhenFound_ReturnsCorrectId()
    {
        var entity = new Vendor { Id = 7, Name = "Vendor Seven" };
        _repo.GetById(7).Returns(entity);
        var handler = new GetVendorByIdHandler(_repo);

        var result = await handler.Handle(new GetVendorByIdQuery(7));

        var ok = Assert.IsType<Ok<Vendor>>(result);
        Assert.Equal(7, ok.Value!.Id);
    }
}
