using Anything.Application.Features.FoodPlans.Commands;
using Anything.Application.Features.FoodPlans.Queries;
using Anything.Contracts.FoodPlans;
using Anything.Core.Entities;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public static class FoodPlanEndpoints
{
    public static void MapFoodPlanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/food-plan");

        // --- Settings ---

        group.MapGet("/settings", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetFoodPlanSettingsQuery());
        })
        .WithName("GetFoodPlanSettings")
        .RequireAuthorization();

        group.MapPut("/settings", async (UpdateFoodPlanSettingsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateFoodPlanSettingsCommand(request.ActiveDays));
        })
        .WithName("UpdateFoodPlanSettings")
        .Produces<FoodPlanSettings>()
        .WithParameterValidation()
        .RequireAuthorization();

        // --- Entries ---

        group.MapGet("/entries", async (DateTime startDate, DateTime endDate, IMediator mediator) =>
        {
            return await mediator.Send(new GetFoodPlanEntriesByDateRangeQuery(startDate, endDate));
        })
        .WithName("GetFoodPlanEntries")
        .RequireAuthorization();

        group.MapPost("/entries", async (AddFoodPlanEntryRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddFoodPlanEntryCommand(request.Name, request.RecipeId, request.Date!.Value, request.Comment));
        })
        .WithName("AddFoodPlanEntry")
        .Produces<FoodPlanEntry>(StatusCodes.Status201Created)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/entries/{entryId}", async (int entryId, UpdateFoodPlanEntryRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateFoodPlanEntryCommand(entryId, request.Name, request.RecipeId, request.Date!.Value, request.Comment));
        })
        .WithName("UpdateFoodPlanEntry")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/entries/{entryId}", async (int entryId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteFoodPlanEntryCommand(entryId));
        })
        .WithName("DeleteFoodPlanEntry")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        // --- Add to shopping list ---

        group.MapPost("/add-to-shopping-list", async (AddFoodPlanToShoppingListRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddFoodPlanToShoppingListCommand(
                request.ShoppingListId!.Value, request.StartDate!.Value, request.EndDate!.Value, request.RecipeMultipliers));
        })
        .WithName("AddFoodPlanToShoppingList")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
