using System.Security.Claims;
using Anything.Application.Features.Households.Commands;
using Anything.Application.Features.Households.Queries;
using Anything.Contracts.Households;
using Anything.Core.Entities;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class HouseholdEndpoints
{
    public static void MapHouseholdEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/households");

        group.MapGet("/", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();
            return Results.Ok(await mediator.Send(new GetHouseholdsQuery(userId)));
        })
        .WithName("GetHouseholds")
        .Produces<List<HouseholdResponse>>()
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new GetHouseholdQuery(id, userId));
        })
        .WithName("GetHousehold")
        .Produces<HouseholdDetailResponse>()
        .Produces(403)
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateHouseholdRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();
            var result = await mediator.Send(new CreateHouseholdCommand(request.Name, userId));
            return Results.Created($"/api/households/{result.Id}", result);
        })
        .WithName("CreateHousehold")
        .Produces<Household>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateHouseholdRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new UpdateHouseholdCommand(id, request.Name, userId));
        })
        .WithName("UpdateHousehold")
        .Produces(200)
        .Produces(403)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPost("/{id}/members", async (int id, AddHouseholdMemberRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new AddHouseholdMemberCommand(id, request.UserId, request.Role, userId));
        })
        .WithName("AddHouseholdMember")
        .Produces(201)
        .Produces(400)
        .Produces(403)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/members/{userId}", async (int id, int userId, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var requestingUserId))
                return Results.Unauthorized();
            return await mediator.Send(new RemoveHouseholdMemberCommand(id, userId, requestingUserId));
        })
        .WithName("RemoveHouseholdMember")
        .Produces(204)
        .Produces(400)
        .Produces(403)
        .Produces(404)
        .RequireAuthorization();
    }

    private static bool TryGetUserId(ClaimsPrincipal user, out int userId)
    {
        userId = 0;
        return int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out userId);
    }
}
