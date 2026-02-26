using Anything.Application.Features.Somethings.Commands;
using Anything.Application.Features.Somethings.Queries;
using Anything.Contracts.Somethings;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class SomethingEndpoints
{
    public static void MapSomethingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/somethings");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetSomethingsQuery());
        })
        .WithName("GetSomethings")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetSomethingByIdQuery(id));
        })
        .WithName("GetSomethingById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateSomethingRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateSomethingCommand(request.Name));
            return Results.Created($"/api/somethings/{result.Id}", result);
        })
        .WithName("CreateSomething")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateSomethingRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateSomethingCommand(id, request.Name));
        })
        .WithName("UpdateSomething")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteSomethingCommand(id));
        })
        .WithName("DeleteSomething")
        .RequireAuthorization();
    }
}
