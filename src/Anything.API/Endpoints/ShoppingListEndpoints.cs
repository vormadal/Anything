using Anything.Application.Features.ShoppingLists.Commands;
using Anything.Application.Features.ShoppingLists.Queries;
using Anything.Contracts.ShoppingLists;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class ShoppingListEndpoints
{
    public static void MapShoppingListEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shopping-lists");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetShoppingListsQuery());
        })
        .WithName("GetShoppingLists")
        .RequireAuthorization();

        group.MapGet("/completed", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetCompletedShoppingListsQuery());
        })
        .WithName("GetCompletedShoppingLists")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetShoppingListByIdQuery(id));
        })
        .WithName("GetShoppingListById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateShoppingListRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateShoppingListCommand(request.Name));
            return Results.Created($"/api/shopping-lists/{result.Id}", result);
        })
        .WithName("CreateShoppingList")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteShoppingListCommand(id));
        })
        .WithName("DeleteShoppingList")
        .RequireAuthorization();

        group.MapGet("/{id}/items", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetShoppingListItemsQuery(id));
        })
        .WithName("GetShoppingListItems")
        .RequireAuthorization();

        group.MapPost("/{id}/items", async (int id, CreateShoppingListItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddShoppingListItemCommand(id, request.Name, request.Amount, request.Unit));
        })
        .WithName("AddShoppingListItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/items/{itemId}", async (int id, int itemId, UpdateShoppingListItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateShoppingListItemCommand(id, itemId, request.Name, request.IsChecked, request.Amount, request.Unit));
        })
        .WithName("UpdateShoppingListItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/items/{itemId}", async (int id, int itemId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteShoppingListItemCommand(id, itemId));
        })
        .WithName("DeleteShoppingListItem")
        .RequireAuthorization();

        group.MapPost("/{id}/complete", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new CompleteShoppingListCommand(id));
        })
        .WithName("CompleteShoppingList")
        .RequireAuthorization();
    }
}
