using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class ShoppingListEndpoints
{
    private const string ListNotFound = "Shopping list not found.";

    public static void MapShoppingListEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shopping-lists");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.ShoppingLists
                .Where(l => l.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetShoppingLists")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.ShoppingLists.FindAsync(id) is ShoppingList list && list.DeletedOn == null
                ? Results.Ok(list)
                : Results.NotFound();
        })
        .WithName("GetShoppingListById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateShoppingListRequest request, ApplicationDbContext db) =>
        {
            var list = new ShoppingList
            {
                Name = request.Name
            };

            db.ShoppingLists.Add(list);
            await db.SaveChangesAsync();
            return Results.Created($"/api/shopping-lists/{list.Id}", list);
        })
        .WithName("CreateShoppingList")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var list = await db.ShoppingLists.FindAsync(id);
            if (list is null || list.DeletedOn != null)
                return Results.NotFound();

            list.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteShoppingList")
        .RequireAuthorization();

        group.MapGet("/{id}/items", async (int id, ApplicationDbContext db) =>
        {
            var list = await db.ShoppingLists.FindAsync(id);
            if (list is null || list.DeletedOn != null)
                return Results.NotFound(ListNotFound);

            var items = await db.ShoppingListItems
                .Where(i => i.ShoppingListId == id && i.DeletedOn == null)
                .ToListAsync();
            return Results.Ok(items);
        })
        .WithName("GetShoppingListItems")
        .RequireAuthorization();

        group.MapPost("/{id}/items", async (int id, CreateShoppingListItemRequest request, ApplicationDbContext db) =>
        {
            var list = await db.ShoppingLists.FindAsync(id);
            if (list is null || list.DeletedOn != null)
                return Results.NotFound(ListNotFound);

            var item = new ShoppingListItem
            {
                ShoppingListId = id,
                Name = request.Name
            };

            db.ShoppingListItems.Add(item);

            var nameNormalized = request.Name.Trim();
            var exists = await db.ShoppingListRecommendations
                .AnyAsync(r => r.Name.ToLower() == nameNormalized.ToLower() && r.DeletedOn == null);
            if (!exists)
            {
                db.ShoppingListRecommendations.Add(new ShoppingListRecommendation
                {
                    Name = nameNormalized,
                    IsApproved = false
                });
            }

            await db.SaveChangesAsync();
            return Results.Created($"/api/shopping-lists/{id}/items/{item.Id}", item);
        })
        .WithName("AddShoppingListItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/items/{itemId}", async (int id, int itemId, UpdateShoppingListItemRequest request, ApplicationDbContext db) =>
        {
            var item = await db.ShoppingListItems.FindAsync(itemId);
            if (item is null || item.DeletedOn != null || item.ShoppingListId != id)
                return Results.NotFound();

            item.Name = request.Name;
            item.IsChecked = request.IsChecked;
            item.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateShoppingListItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/items/{itemId}", async (int id, int itemId, ApplicationDbContext db) =>
        {
            var item = await db.ShoppingListItems.FindAsync(itemId);
            if (item is null || item.DeletedOn != null || item.ShoppingListId != id)
                return Results.NotFound();

            item.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteShoppingListItem")
        .RequireAuthorization();

        group.MapPost("/{id}/complete", async (int id, ApplicationDbContext db) =>
        {
            var list = await db.ShoppingLists.FindAsync(id);
            if (list is null || list.DeletedOn != null)
                return Results.NotFound();

            var now = DateTime.UtcNow;

            var items = await db.ShoppingListItems
                .Where(i => i.ShoppingListId == id && i.DeletedOn == null)
                .ToListAsync();

            foreach (var item in items)
            {
                if (!item.IsChecked)
                {
                    item.IsChecked = true;
                    item.ModifiedOn = now;
                }
            }

            list.DeletedOn = now;

            var newList = new ShoppingList
            {
                Name = list.Name
            };

            db.ShoppingLists.Add(newList);
            await db.SaveChangesAsync();
            return Results.Created($"/api/shopping-lists/{newList.Id}", newList);
        })
        .WithName("CompleteShoppingList")
        .RequireAuthorization();
    }
}

public record CreateShoppingListRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name);

public record CreateShoppingListItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name);

public record UpdateShoppingListItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    bool IsChecked);
