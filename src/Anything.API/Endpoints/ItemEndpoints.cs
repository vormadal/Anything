using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class ItemEndpoints
{
    public static void MapItemEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/items");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.Items
                .Where(i => i.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetItems")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.Items.FindAsync(id) is Item item && item.DeletedOn == null
                ? Results.Ok(item)
                : Results.NotFound();
        })
        .WithName("GetItemById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateItemRequest request, ApplicationDbContext db) =>
        {
            var item = new Item
            {
                Name = request.Name,
                Description = request.Description,
                BoxId = request.BoxId,
                StorageUnitId = request.StorageUnitId
            };

            db.Items.Add(item);
            await db.SaveChangesAsync();
            return Results.Created($"/api/items/{item.Id}", item);
        })
        .WithName("CreateItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateItemRequest request, ApplicationDbContext db) =>
        {
            var item = await db.Items.FindAsync(id);
            if (item is null || item.DeletedOn != null)
                return Results.NotFound();

            item.Name = request.Name;
            item.Description = request.Description;
            item.BoxId = request.BoxId;
            item.StorageUnitId = request.StorageUnitId;
            item.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var item = await db.Items.FindAsync(id);
            if (item is null || item.DeletedOn != null)
                return Results.NotFound();

            item.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteItem")
        .RequireAuthorization();
    }
}

public record CreateItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    string? Description,
    int? BoxId,
    int? StorageUnitId);

public record UpdateItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    string? Description,
    int? BoxId,
    int? StorageUnitId);
