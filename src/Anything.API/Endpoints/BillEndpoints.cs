using Anything.Application.Features.Bills.Commands;
using Anything.Application.Features.Bills.Queries;
using Anything.Contracts.Bills;
using Anything.Core.Entities;
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
            .Produces<BillResponse>()
            .Produces(404)
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
            .Produces<Bill>(StatusCodes.Status201Created)
            .Produces(400)
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
            .Produces(204)
            .Produces(400)
            .Produces(404)
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new DeleteBillCommand(id)))
            .WithName("DeleteBill")
            .Produces(204)
            .Produces(404)
            .RequireAuthorization();

        group.MapGet("/{id}/price-history", async (int id, IMediator mediator) =>
            await mediator.Send(new GetBillPriceHistoryQuery(id)))
            .WithName("GetBillPriceHistory")
            .RequireAuthorization();

        group.MapPost("/{id}/price-history", async (int id, AddBillPriceRequest request, IMediator mediator) =>
            await mediator.Send(new AddBillPriceCommand(
                id, request.Amount, request.EffectiveDate, request.Notes)))
            .WithName("AddBillPrice")
            .Produces<BillPriceHistory>(StatusCodes.Status201Created)
            .Produces(404)
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapPut("/{id}/price-history/{historyId}", async (
            int id, int historyId, UpdateBillPriceRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateBillPriceCommand(
                id, historyId, request.Amount, request.EffectiveDate, request.Notes)))
            .WithName("UpdateBillPrice")
            .Produces(204)
            .Produces(404)
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapDelete("/{id}/price-history/{historyId}", async (int id, int historyId, IMediator mediator) =>
            await mediator.Send(new DeleteBillPriceCommand(id, historyId)))
            .WithName("DeleteBillPrice")
            .Produces(204)
            .Produces(404)
            .RequireAuthorization();
    }
}
