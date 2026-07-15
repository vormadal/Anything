using Anything.API.Authorization;
using Anything.Application.Features.Recommendations.Commands;
using Anything.Application.Features.Recommendations.Queries;
using Anything.Contracts.Recommendations;
using Anything.Core.Entities;
using Anything.Mediator;
using Microsoft.AspNetCore.Mvc;

namespace Anything.API.Endpoints;

public static class RecommendationEndpoints
{
    public static void MapRecommendationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shopping-list-recommendations");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetAllRecommendationsQuery(SuggestableOnly: true));
        })
        .WithName("GetRecommendations")
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization();

        group.MapPost("/", async ([FromBody] CreateRecommendationRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateRecommendationCommand(request.Name, request.PreferredUnit));
        })
        .WithName("CreateRecommendation")
        .Produces<ShoppingListRecommendation>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapGet("/all", async ([FromQuery] int? categoryId, IMediator mediator) =>
        {
            return await mediator.Send(new GetAllRecommendationsQuery(categoryId));
        })
        .WithName("GetAllRecommendations")
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization();

        group.MapGet("/uncategorized", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetUncategorizedRecommendationsQuery());
        })
        .WithName("GetUncategorizedRecommendations")
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, [FromBody] UpdateRecommendationRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecommendationCommand(id, request.Name, request.PreferredUnit, request.CategoryId, request.IncludeInSuggestions));
        })
        .WithName("UpdateRecommendation")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecommendationCommand(id));
        })
        .WithName("DeleteRecommendation")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapGet("/export", async ([FromQuery] bool? uncategorizedOnly, IMediator mediator) =>
        {
            return await mediator.Send(new ExportRecommendationsQuery(uncategorizedOnly ?? false));
        })
        .WithName("ExportRecommendations")
        .Produces<ExportRecommendationsResponse>(StatusCodes.Status200OK)
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapPost("/import", async ([FromBody] ImportRecommendationsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ImportRecommendationsCommand(request.Recommendations));
        })
        .WithName("ImportRecommendations")
        .Produces(StatusCodes.Status204NoContent)
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();
    }
}
