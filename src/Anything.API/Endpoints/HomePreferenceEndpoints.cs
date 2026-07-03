using System.Security.Claims;
using Anything.Application.Features.HomePreferences.Commands;
using Anything.Application.Features.HomePreferences.Queries;
using Anything.Contracts.HomePreferences;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public static class HomePreferenceEndpoints
{
    public static void MapHomePreferenceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/home/card-preferences");

        group.MapGet("/", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();

            return Results.Ok(await mediator.Send(new GetHomeCardPreferencesQuery(userId)));
        })
        .WithName("GetHomeCardPreferences")
        .Produces<List<HomeCardPreferenceResponse>>()
        .RequireAuthorization();

        group.MapPut("/", async (UpdateHomeCardPreferencesRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new UpdateHomeCardPreferencesCommand(userId, request.Cards));
        })
        .WithName("UpdateHomeCardPreferences")
        .Produces(204)
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
