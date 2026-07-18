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
            return await mediator.Send(new CreateRecommendationCommand(request.Name, request.PreferredUnit, request.ShoppingListId));
        })
        .WithName("CreateRecommendation")
        .Produces<ShoppingListRecommendation>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status404NotFound)
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();

        // Ranked, typo-tolerant search backing the item-suggestion typeahead and
        // the recommendations admin search — avoids loading the whole list client-side.
        // shoppingListId scopes results to that list's own suggestions plus the shared ones.
        group.MapGet("/search", async ([FromQuery] string? query, [FromQuery] int? limit, [FromQuery] int? shoppingListId, IMediator mediator) =>
        {
            return await mediator.Send(new SearchRecommendationsQuery(query, limit ?? 20, shoppingListId));
        })
        .WithName("SearchRecommendations")
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization();

        group.MapGet("/all", async (
            [FromQuery] int? categoryId,
            [FromQuery] int? shoppingListId,
            [FromQuery] bool? sharedOnly,
            [FromQuery] bool? uncategorized,
            [FromQuery] bool? includeInSuggestions,
            IMediator mediator) =>
        {
            return await mediator.Send(new GetAllRecommendationsQuery(
                categoryId,
                SuggestableOnly: false,
                ShoppingListId: shoppingListId,
                SharedOnly: sharedOnly ?? false,
                Uncategorized: uncategorized,
                IncludeInSuggestions: includeInSuggestions));
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

        // Scans the household for near-duplicate suggestion names (typos, plurals) and
        // returns them clustered into groups so a manager can merge each group.
        group.MapGet("/duplicates", async (IMediator mediator) =>
        {
            return await mediator.Send(new FindDuplicateRecommendationsQuery());
        })
        .WithName("FindDuplicateRecommendations")
        .WithSummary("Find groups of near-duplicate suggestions that can be merged.")
        .Produces<List<DuplicateRecommendationGroup>>(StatusCodes.Status200OK)
        .RequireAuthorization();

        // Keeps the target suggestion and deletes the sources, optionally applying a
        // canonical name/category/unit. Existing items (linked only by name) are untouched.
        group.MapPost("/merge", async ([FromBody] MergeRecommendationsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new MergeRecommendationsCommand(
                request.TargetId,
                request.SourceIds,
                request.Name,
                request.CategoryId,
                request.PreferredUnit,
                request.IncludeInSuggestions));
        })
        .WithName("MergeRecommendations")
        .WithSummary("Merge one or more duplicate suggestions into a single canonical one.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status409Conflict)
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapPut("/{id}", async (int id, [FromBody] UpdateRecommendationRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecommendationCommand(id, request.Name, request.PreferredUnit, request.CategoryId, request.IncludeInSuggestions, request.ShoppingListId));
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

        // Clears a single list's own suggestions; shared (all-list) suggestions are left in place.
        group.MapDelete("/by-list/{shoppingListId}", async (int shoppingListId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecommendationsForListCommand(shoppingListId));
        })
        .WithName("DeleteRecommendationsForList")
        .WithSummary("Remove all suggestions that belong specifically to a single shopping list. Shared suggestions are left untouched.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .RequireAuthorization()
        .RequireHouseholdManager();

        // Clears all shared (all-list) suggestions; list-specific suggestions are left in place.
        group.MapDelete("/shared", async (IMediator mediator) =>
        {
            return await mediator.Send(new DeleteSharedRecommendationsCommand());
        })
        .WithName("DeleteSharedRecommendations")
        .WithSummary("Remove all shared (all-list) suggestions. List-specific suggestions are left untouched.")
        .Produces(StatusCodes.Status204NoContent)
        .RequireAuthorization()
        .RequireHouseholdManager();

        // Moves every suggestion from one scope to another (null list id = shared). A moved
        // suggestion whose name already exists in the destination is dropped, not duplicated.
        group.MapPost("/transfer", async ([FromBody] TransferRecommendationsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new TransferRecommendationsCommand(request.FromShoppingListId, request.ToShoppingListId));
        })
        .WithName("TransferRecommendations")
        .WithSummary("Bulk-move suggestions from one scope to another; duplicates in the destination are dropped.")
        .Produces<TransferRecommendationsResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status404NotFound)
        .WithParameterValidation()
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
