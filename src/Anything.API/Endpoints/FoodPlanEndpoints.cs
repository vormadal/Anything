using Anything.Application.Features.FoodPlans.Commands;
using Anything.Application.Features.FoodPlans.Queries;
using Anything.Contracts.FoodPlans;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public static class FoodPlanEndpoints
{
    public static void MapFoodPlanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/food-plans");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetFoodPlansQuery());
        })
        .WithName("GetFoodPlans")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetFoodPlanByIdQuery(id));
        })
        .WithName("GetFoodPlanById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateFoodPlanRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateFoodPlanCommand(request.Name, request.WeekStart));
            return Results.Created($"/api/food-plans/{result.Id}", result);
        })
        .WithName("CreateFoodPlan")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateFoodPlanRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateFoodPlanCommand(id, request.Name, request.WeekStart));
        })
        .WithName("UpdateFoodPlan")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteFoodPlanCommand(id));
        })
        .WithName("DeleteFoodPlan")
        .RequireAuthorization();

        // Entries
        group.MapGet("/{id}/entries", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetFoodPlanEntriesQuery(id));
        })
        .WithName("GetFoodPlanEntries")
        .RequireAuthorization();

        group.MapPost("/{id}/entries", async (int id, AddFoodPlanEntryRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddFoodPlanEntryCommand(id, request.Name, request.RecipeId, request.DayOfWeek));
        })
        .WithName("AddFoodPlanEntry")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/entries/{entryId}", async (int id, int entryId, UpdateFoodPlanEntryRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateFoodPlanEntryCommand(id, entryId, request.Name, request.RecipeId, request.DayOfWeek));
        })
        .WithName("UpdateFoodPlanEntry")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/entries/{entryId}", async (int id, int entryId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteFoodPlanEntryCommand(id, entryId));
        })
        .WithName("DeleteFoodPlanEntry")
        .RequireAuthorization();

        // Add food plan recipes to shopping list
        group.MapPost("/{id}/add-to-shopping-list", async (int id, AddFoodPlanToShoppingListRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddFoodPlanToShoppingListCommand(id, request.ShoppingListId, request.RecipeMultipliers));
        })
        .WithName("AddFoodPlanToShoppingList")
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
