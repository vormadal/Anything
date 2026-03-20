using Anything.Application.Features.Bills.Commands;
using Anything.Application.Features.Bills.Queries;
using Anything.Contracts.Bills;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public static class BillEndpoints
{
    public static void MapBillEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/bills");

        group.MapGet("/", async (IMediator mediator) =>
            await mediator.Send(new GetBillsQuery()))
            .WithName("GetBills")
            .RequireAuthorization();

        group.MapGet("/summary", async (IMediator mediator) =>
            await mediator.Send(new GetBillSummaryQuery()))
            .WithName("GetBillSummary")
            .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new GetBillByIdQuery(id)))
            .WithName("GetBillById")
            .RequireAuthorization();

        group.MapPost("/", async (CreateBillRequest request, IMediator mediator) =>
            await mediator.Send(new CreateBillCommand(
                request.Name,
                request.VendorId,
                request.Frequency,
                request.IsAutomated,
                request.LocationId,
                request.ManagementUrl,
                request.Category,
                request.Notes,
                request.InitialAmount,
                request.InitialEffectiveDate)))
            .WithName("CreateBill")
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateBillRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateBillCommand(
                id,
                request.Name,
                request.VendorId,
                request.Frequency,
                request.IsAutomated,
                request.LocationId,
                request.ManagementUrl,
                request.Category,
                request.Notes)))
            .WithName("UpdateBill")
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new DeleteBillCommand(id)))
            .WithName("DeleteBill")
            .RequireAuthorization();

        group.MapGet("/{id}/price-history", async (int id, IMediator mediator) =>
            await mediator.Send(new GetBillPriceHistoryQuery(id)))
            .WithName("GetBillPriceHistory")
            .RequireAuthorization();

        group.MapPost("/{id}/price-history", async (int id, AddBillPriceRequest request, IMediator mediator) =>
            await mediator.Send(new AddBillPriceCommand(
                id, request.Amount, request.EffectiveDate, request.Notes)))
            .WithName("AddBillPrice")
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapPut("/{id}/price-history/{historyId}", async (
            int id, int historyId, UpdateBillPriceRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateBillPriceCommand(
                id, historyId, request.Amount, request.EffectiveDate, request.Notes)))
            .WithName("UpdateBillPrice")
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapDelete("/{id}/price-history/{historyId}", async (int id, int historyId, IMediator mediator) =>
            await mediator.Send(new DeleteBillPriceCommand(id, historyId)))
            .WithName("DeleteBillPrice")
            .RequireAuthorization();
    }
}
