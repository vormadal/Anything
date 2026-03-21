using Anything.Application.Features.Vendors.Commands;
using Anything.Application.Features.Vendors.Queries;
using Anything.Contracts.Vendors;
using Anything.Core.Entities;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public static class VendorEndpoints
{
    public static void MapVendorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vendors");

        group.MapGet("/", async (IMediator mediator) =>
            await mediator.Send(new GetVendorsQuery()))
            .WithName("GetVendors")
            .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new GetVendorByIdQuery(id)))
            .WithName("GetVendorById")
            .Produces<Vendor>()
            .Produces(404)
            .RequireAuthorization();

        group.MapPost("/", async (CreateVendorRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateVendorCommand(request.Name, request.Website));
            return Results.Created($"/api/vendors/{result.Id}", result);
        })
        .WithName("CreateVendor")
        .Produces<Vendor>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateVendorRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateVendorCommand(id, request.Name, request.Website)))
            .WithName("UpdateVendor")
            .Produces(204)
            .Produces(404)
            .WithParameterValidation()
            .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new DeleteVendorCommand(id)))
            .WithName("DeleteVendor")
            .Produces(204)
            .Produces(404)
            .RequireAuthorization();
    }
}
