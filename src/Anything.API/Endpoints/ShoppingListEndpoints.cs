using Anything.Application.Features.ShoppingLists.Commands;
using Anything.Application.Features.ShoppingLists.Queries;
using Anything.Contracts.ShoppingLists;
using Anything.Core.Entities;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class ShoppingListEndpoints
{
    public static void MapShoppingListEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/checklists");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetShoppingListsQuery());
        })
        .WithName("GetShoppingLists")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetShoppingListByIdQuery(id));
        })
        .WithName("GetShoppingListById")
        .Produces<ShoppingList>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateShoppingListRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateShoppingListCommand(request.Name, (ListType)request.Type));
            return Results.Created($"/api/checklists/{result.Id}", result);
        })
        .WithName("CreateShoppingList")
        .Produces<ShoppingList>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/reorder", async (ReorderShoppingListsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReorderShoppingListsCommand(request.Ids));
        })
        .WithName("ReorderShoppingLists")
        .Produces(204)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/type", async (int id, ConvertShoppingListTypeRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ConvertShoppingListTypeCommand(id, (ListType)request.Type));
        })
        .WithName("ConvertShoppingListType")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateShoppingListRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateShoppingListCommand(id, request.Name));
        })
        .WithName("UpdateShoppingList")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteShoppingListCommand(id));
        })
        .WithName("DeleteShoppingList")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        group.MapGet("/{id}/items", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetShoppingListItemsQuery(id));
        })
        .WithName("GetShoppingListItems")
        .Produces<List<ShoppingListItem>>()
        .RequireAuthorization();

        group.MapPost("/{id}/items", async (int id, CreateShoppingListItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddShoppingListItemCommand(id, request.Name, request.Amount, request.Unit));
        })
        .WithName("AddShoppingListItem")
        .Produces<ShoppingListItem>(StatusCodes.Status201Created)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/items/{itemId}", async (int id, int itemId, UpdateShoppingListItemRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateShoppingListItemCommand(id, itemId, request.Name, request.IsChecked, request.Amount, request.Unit));
        })
        .WithName("UpdateShoppingListItem")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/items/reorder", async (int id, ReorderShoppingListItemsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReorderShoppingListItemsCommand(id, request.Ids));
        })
        .WithName("ReorderShoppingListItems")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/items/{itemId}", async (int id, int itemId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteShoppingListItemCommand(id, itemId));
        })
        .WithName("DeleteShoppingListItem")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/{id}/complete", async (int id, CompleteShoppingListRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CompleteShoppingListCommand(id, request.MarkUnchecked));
        })
        .WithName("CompleteShoppingList")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
