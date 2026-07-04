using System.Security.Claims;
using Anything.Application.Features.Recipes.Commands;
using Anything.Application.Features.Recipes.Queries;
using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public static class SharedRecipeEndpoints
{
    public static void MapSharedRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shared/recipes");

        group.MapGet("/{token}", async (string token, IMediator mediator) =>
            await mediator.Send(new GetSharedRecipeQuery(token)))
            .WithName("GetSharedRecipe")
            .Produces<SharedRecipeResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .AllowAnonymous();

        group.MapPost("/{token}/clone", async (
            string token,
            CloneSharedRecipeRequest request,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();

            var email = user.FindFirst(ClaimTypes.Email)?.Value;
            if (email is null)
                return Results.Unauthorized();

            return await mediator.Send(new CloneSharedRecipeCommand(token, request.TargetHouseholdId, userId, email));
        })
        .WithName("CloneSharedRecipe")
        .Produces<Recipe>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status403Forbidden)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status410Gone)
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
