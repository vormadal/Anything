using Anything.Application.Features.Renovation;
using Anything.Application.Features.Renovation.Commands;
using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Xunit;

namespace Anything.Application.UnitTests.Features.Renovation;

public class RenovationTemplateResolverTests
{
    private static readonly string[] BuiltInKeys = RenovationRoomTemplates.All.Select(t => t.RoomType).ToArray();

    private static RenovationRoomTemplate Row(int id, int householdId, string roomType, string label = "Custom", bool deleted = false) => new()
    {
        Id = id, HouseholdId = householdId, RoomType = roomType, Label = label,
        Length = 3m, Width = 2m, Height = 2.5m, Doors = 1, Windows = 0,
        DeletedOn = deleted ? DateTime.UtcNow : null
    };

    private static RenovationRoomTemplateLine TemplateLine(int templateId, string key, decimal price = 100m) => new()
    {
        TemplateId = templateId, Key = key, Label = key, Group = "Surfaces", MaterialName = $"{key} material",
        Category = "Flooring", Basis = RenovationQuantityBasis.Floor, Unit = "m²", DefaultPrice = price, EnabledByDefault = true
    };

    [Fact]
    public async Task Resolve_BuiltInsOnly_WhenHouseholdHasNoRows()
    {
        var f = new RenovationFakes();

        var templates = await RenovationTemplateResolver.Resolve(f.Repos(), RenovationFakes.HouseholdId, TestContext.Current.CancellationToken);

        Assert.Equal(BuiltInKeys, templates.Select(t => t.Template.RoomType));
        Assert.All(templates, t =>
        {
            Assert.True(t.IsBuiltIn);
            Assert.False(t.IsCustomised);
        });
    }

    [Fact]
    public async Task Resolve_CustomisedBuiltIn_ReplacesTheDefault_InItsCodePosition()
    {
        var f = new RenovationFakes();
        f.RoomTemplates.Add(Row(1, RenovationFakes.HouseholdId, "bathroom", "Wet room"));
        f.RoomTemplateLines.Add(TemplateLine(1, "only", 999m));

        var templates = await RenovationTemplateResolver.Resolve(f.Repos(), RenovationFakes.HouseholdId, TestContext.Current.CancellationToken);

        Assert.Equal(BuiltInKeys, templates.Select(t => t.Template.RoomType));
        var bathroom = Assert.Single(templates, t => t.Template.RoomType == "bathroom");
        Assert.True(bathroom.IsBuiltIn);
        Assert.True(bathroom.IsCustomised);
        Assert.Equal("Wet room", bathroom.Template.Label);
        Assert.Equal(new[] { "only" }, bathroom.Template.Lines.Select(l => l.Key).ToList());
        Assert.Equal(999m, bathroom.Template.Lines.Single().Price);
    }

    [Fact]
    public async Task Resolve_CustomType_IsAppendedAfterBuiltIns_OrderedByLabel()
    {
        var f = new RenovationFakes();
        f.RoomTemplates.Add(Row(1, RenovationFakes.HouseholdId, "garage", "Garage"));
        f.RoomTemplates.Add(Row(2, RenovationFakes.HouseholdId, "attic", "Attic"));

        var templates = await RenovationTemplateResolver.Resolve(f.Repos(), RenovationFakes.HouseholdId, TestContext.Current.CancellationToken);

        Assert.Equal(BuiltInKeys.Concat(new[] { "attic", "garage" }), templates.Select(t => t.Template.RoomType));
        var garage = templates.Last();
        Assert.False(garage.IsBuiltIn);
        Assert.False(garage.IsCustomised);
        Assert.True(garage.CarriesOwnPrices);
        Assert.Equal("Garage", garage.Template.Label);
    }

    [Fact]
    public async Task Resolve_DeletedRows_AreIgnored()
    {
        var f = new RenovationFakes();
        f.RoomTemplates.Add(Row(1, RenovationFakes.HouseholdId, "bathroom", "Wet room", deleted: true));
        f.RoomTemplateLines.Add(TemplateLine(1, "only"));
        f.RoomTemplates.Add(Row(2, RenovationFakes.HouseholdId, "garage", "Garage", deleted: true));

        var templates = await RenovationTemplateResolver.Resolve(f.Repos(), RenovationFakes.HouseholdId, TestContext.Current.CancellationToken);

        Assert.Equal(BuiltInKeys, templates.Select(t => t.Template.RoomType));
        Assert.All(templates, t => Assert.False(t.IsCustomised));
    }

    [Fact]
    public async Task Resolve_OtherHouseholdsRows_AreIgnored()
    {
        var f = new RenovationFakes();
        f.RoomTemplates.Add(Row(1, 99, "bathroom", "Their bathroom"));
        f.RoomTemplateLines.Add(TemplateLine(1, "theirs"));
        f.RoomTemplates.Add(Row(2, 99, "garage", "Their garage"));

        var templates = await RenovationTemplateResolver.Resolve(f.Repos(), RenovationFakes.HouseholdId, TestContext.Current.CancellationToken);

        Assert.Equal(BuiltInKeys, templates.Select(t => t.Template.RoomType));
        Assert.All(templates, t => Assert.False(t.IsCustomised));
    }
}

public class SaveRenovationRoomTemplateHandlerTests
{
    private readonly RenovationFakes _f = new();

    private SaveRenovationRoomTemplateHandler Handler() =>
        new(_f.Repos(), _f.HouseholdContext, _f.UnitOfWork, _f.TimeProvider);

    private static SaveRenovationTemplateLineRequest Line(string key, string basis = "Floor", decimal price = 100m, decimal? fixedQuantity = null) =>
        new(key, key, "Surfaces", $"{key} material", "Flooring", basis, "m²", price, 0m, fixedQuantity);

    private static SaveRenovationRoomTemplateRequest Request(params SaveRenovationTemplateLineRequest[] lines) =>
        new("Bathroom", 2.4m, 1.8m, 2.4m, 1, 0, lines.ToList());

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Handle_FirstSave_CreatesRowAndLinesInArrayOrder()
    {
        var result = await Handler().Handle(
            new SaveRenovationRoomTemplateCommand("bathroom", Request(Line("walls"), Line("floor"), Line("membrane"))), Ct);

        var ok = Assert.IsType<Ok<RenovationRoomTemplateResponse>>(result);
        var row = Assert.Single(_f.RoomTemplates);
        Assert.Equal("bathroom", row.RoomType);
        Assert.Equal(RenovationFakes.HouseholdId, row.HouseholdId);
        Assert.Null(row.DeletedOn);
        Assert.Equal(new[] { "walls", "floor", "membrane" }, _f.RoomTemplateLines.Select(l => l.Key).ToList());
        Assert.Equal(new[] { 0, 1, 2 }, _f.RoomTemplateLines.Select(l => l.SortOrder).ToList());
        Assert.All(_f.RoomTemplateLines, l => Assert.Equal(row.Id, l.TemplateId));
        Assert.True(ok.Value!.IsBuiltIn);
        Assert.True(ok.Value.IsCustomised);
    }

    [Fact]
    public async Task Handle_SecondSave_UpdatesRowAndReplacesLines()
    {
        var handler = Handler();
        await handler.Handle(new SaveRenovationRoomTemplateCommand("bathroom", Request(Line("walls"), Line("floor"))), Ct);
        var first = Assert.Single(_f.RoomTemplates);
        var firstId = first.Id;

        var replace = new SaveRenovationRoomTemplateRequest("Wet room", 3m, 2m, 2.5m, 2, 1, [Line("ceiling")]);
        await handler.Handle(new SaveRenovationRoomTemplateCommand("bathroom", replace), Ct);

        var row = Assert.Single(_f.RoomTemplates);
        Assert.Equal(firstId, row.Id);
        Assert.Equal("Wet room", row.Label);
        Assert.Equal(2, row.Doors);
        Assert.NotNull(row.ModifiedOn);
        var line = Assert.Single(_f.RoomTemplateLines);
        Assert.Equal("ceiling", line.Key);
        Assert.Equal(0, line.SortOrder);
        Assert.Equal(firstId, line.TemplateId);
    }

    [Fact]
    public async Task Handle_SavingAfterDelete_CreatesAFreshRow()
    {
        _f.RoomTemplates.Add(new RenovationRoomTemplate
        {
            Id = 5, HouseholdId = RenovationFakes.HouseholdId, RoomType = "bathroom", Label = "Old", DeletedOn = DateTime.UtcNow
        });

        await Handler().Handle(new SaveRenovationRoomTemplateCommand("bathroom", Request(Line("floor"))), Ct);

        Assert.Equal(2, _f.RoomTemplates.Count);
        Assert.Single(_f.RoomTemplates, r => r.DeletedOn is null);
    }

    [Fact]
    public async Task Handle_DuplicateLineKeys_ReturnsBadRequest_AndWritesNothing()
    {
        var result = await Handler().Handle(
            new SaveRenovationRoomTemplateCommand("bathroom", Request(Line("floor"), Line("floor", price: 5m))), Ct);

        Assert.IsType<BadRequest<string>>(result);
        Assert.Empty(_f.RoomTemplates);
        Assert.Empty(_f.RoomTemplateLines);
    }

    [Theory]
    [InlineData("Garage!")]
    [InlineData("has space")]
    [InlineData("UPPER")]
    [InlineData("under_score")]
    public async Task Handle_InvalidRoomType_ReturnsBadRequest(string roomType)
    {
        var result = await Handler().Handle(new SaveRenovationRoomTemplateCommand(roomType, Request(Line("floor"))), Ct);

        Assert.IsType<BadRequest<string>>(result);
        Assert.Empty(_f.RoomTemplates);
    }

    [Fact]
    public async Task Handle_RoomTypeTooLong_ReturnsBadRequest()
    {
        var result = await Handler().Handle(
            new SaveRenovationRoomTemplateCommand(new string('a', 51), Request(Line("floor"))), Ct);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_FixedLineWithoutQuantity_ReturnsBadRequest()
    {
        var result = await Handler().Handle(
            new SaveRenovationRoomTemplateCommand("bathroom", Request(Line("electrician", basis: "Fixed"))), Ct);

        Assert.IsType<BadRequest<string>>(result);
        Assert.Empty(_f.RoomTemplates);
    }

    [Fact]
    public async Task Handle_UnknownBasis_ReturnsBadRequest()
    {
        var result = await Handler().Handle(
            new SaveRenovationRoomTemplateCommand("bathroom", Request(Line("floor", basis: "Volume"))), Ct);

        Assert.IsType<BadRequest<string>>(result);
    }

    [Fact]
    public async Task Handle_LineFailingAttributeValidation_ReturnsBadRequest()
    {
        var blankKey = new SaveRenovationTemplateLineRequest("", "Floor", "Surfaces", "Tiles", "Tiles", "Floor", "m²", 100m, 0m, null);

        var result = await Handler().Handle(new SaveRenovationRoomTemplateCommand("bathroom", Request(blankKey)), Ct);

        Assert.IsType<BadRequest<string>>(result);
        Assert.Empty(_f.RoomTemplates);
    }

    [Fact]
    public async Task Handle_MoreThanOneHundredLines_ReturnsBadRequest()
    {
        var lines = Enumerable.Range(0, 101).Select(i => Line($"line{i}")).ToArray();

        var result = await Handler().Handle(new SaveRenovationRoomTemplateCommand("bathroom", Request(lines)), Ct);

        Assert.IsType<BadRequest<string>>(result);
    }
}

public class DeleteRenovationRoomTemplateHandlerTests
{
    private readonly RenovationFakes _f = new();

    private DeleteRenovationRoomTemplateHandler Handler() =>
        new(_f.Repos(), _f.HouseholdContext, _f.UnitOfWork, _f.TimeProvider);

    [Fact]
    public async Task Handle_NoRowForRoomType_ReturnsNotFound()
    {
        var result = await Handler().Handle(new DeleteRenovationRoomTemplateCommand("bathroom"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
    }

    [Fact]
    public async Task Handle_RowOfAnotherHousehold_ReturnsNotFound()
    {
        _f.RoomTemplates.Add(new RenovationRoomTemplate { Id = 5, HouseholdId = 99, RoomType = "bathroom", Label = "Theirs" });

        var result = await Handler().Handle(new DeleteRenovationRoomTemplateCommand("bathroom"), TestContext.Current.CancellationToken);

        Assert.IsType<NotFound>(result);
        Assert.Null(_f.RoomTemplates[0].DeletedOn);
    }

    [Fact]
    public async Task Handle_LiveRow_SoftDeletesRowAndRemovesItsLines()
    {
        _f.RoomTemplates.Add(new RenovationRoomTemplate { Id = 5, HouseholdId = RenovationFakes.HouseholdId, RoomType = "bathroom", Label = "Mine" });
        _f.RoomTemplates.Add(new RenovationRoomTemplate { Id = 6, HouseholdId = RenovationFakes.HouseholdId, RoomType = "garage", Label = "Garage" });
        _f.RoomTemplateLines.Add(new RenovationRoomTemplateLine { Id = 50, TemplateId = 5, Key = "floor", Label = "Floor" });
        _f.RoomTemplateLines.Add(new RenovationRoomTemplateLine { Id = 51, TemplateId = 6, Key = "floor", Label = "Floor" });

        var result = await Handler().Handle(new DeleteRenovationRoomTemplateCommand("bathroom"), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.NotNull(_f.RoomTemplates[0].DeletedOn);
        Assert.Null(_f.RoomTemplates[1].DeletedOn);
        Assert.Equal(new[] { 51 }, _f.RoomTemplateLines.Select(l => l.Id).ToList());
    }
}

public class CreateRenovationRoomFromTemplateTests
{
    [Fact]
    public async Task Handle_CustomisedTemplate_SeedsRoomWithItsOwnLinesAndPrices()
    {
        var f = new RenovationFakes();
        f.Projects.Add(new RenovationProject { Id = 10, HouseholdId = RenovationFakes.HouseholdId, Name = "P" });
        // The household's material is cheaper than the template line; a customised template's own price wins.
        f.Materials.Add(new RenovationMaterial
        {
            Id = 7, HouseholdId = RenovationFakes.HouseholdId, Name = "Floor tiles 30×60", Category = "Tiles",
            Unit = "m²", DefaultPrice = 495m, WastePercent = 10m
        });
        f.RoomTemplates.Add(new RenovationRoomTemplate
        {
            Id = 5, HouseholdId = RenovationFakes.HouseholdId, RoomType = "bathroom", Label = "Wet room",
            Length = 2.4m, Width = 1.8m, Height = 2.4m, Doors = 1, Windows = 0
        });
        f.RoomTemplateLines.Add(new RenovationRoomTemplateLine
        {
            Id = 60, TemplateId = 5, Key = "floor", Label = "Floor", Group = "Surfaces", MaterialName = "Floor tiles 30×60",
            Category = "Tiles", Basis = RenovationQuantityBasis.Floor, Unit = "m²", DefaultPrice = 600m, WastePercent = 5m,
            EnabledByDefault = true, SortOrder = 0
        });
        f.RoomTemplateLines.Add(new RenovationRoomTemplateLine
        {
            Id = 61, TemplateId = 5, Key = "walls", Label = "Walls", Group = "Surfaces", MaterialName = "Wall tiles 30×60",
            Category = "Tiles", Basis = RenovationQuantityBasis.Wall, Unit = "m²", DefaultPrice = 420m, WastePercent = 10m,
            EnabledByDefault = true, SortOrder = 1
        });
        var handler = new CreateRenovationRoomHandler(f.Repos(), f.HouseholdContext, f.UnitOfWork, f.TimeProvider);

        var result = await handler.Handle(new CreateRenovationRoomCommand(10,
            new CreateRenovationRoomRequest("Bathroom", "bathroom", 2.4m, 1.8m, 2.4m, 1, 0, null)),
            TestContext.Current.CancellationToken);

        Assert.IsType<Created<RenovationRoomResponse>>(result);
        Assert.Equal(new[] { "Floor", "Walls" }, f.Lines.Select(l => l.Label).ToList());
        var floor = f.Lines.Single(l => l.Label == "Floor");
        Assert.Equal(600m, floor.UnitPrice);
        Assert.Equal(5m, floor.WastePercent);
        Assert.Equal("m²", floor.Unit);
        Assert.Equal(7, floor.MaterialId);
        Assert.Equal("Floor tiles 30×60", floor.Description);
        Assert.Equal(420m, f.Lines.Single(l => l.Label == "Walls").UnitPrice);
        Assert.Equal("bathroom", f.Rooms.Single().RoomType);
    }
}
