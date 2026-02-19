using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class InventoryItemEndpoints
{
    public static void MapInventoryItemEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory-items");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.InventoryItems
                .Where(i => i.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetInventoryItems")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.InventoryItems.FindAsync(id) is InventoryItem item && item.DeletedOn == null
                ? Results.Ok(item)
                : Results.NotFound();
        })
        .WithName("GetInventoryItemById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryItemRequest request, ApplicationDbContext db) =>
        {
            if (request.BoxId.HasValue)
            {
                var box = await db.InventoryBoxes.FindAsync(request.BoxId.Value);
                if (box is null || box.DeletedOn != null)
                    return Results.BadRequest("Invalid box ID.");
            }

            if (request.StorageUnitId.HasValue)
            {
                var storageUnit = await db.InventoryStorageUnits.FindAsync(request.StorageUnitId.Value);
                if (storageUnit is null || storageUnit.DeletedOn != null)
                    return Results.BadRequest("Invalid storage unit ID.");
            }

            var item = new InventoryItem
            {
                Name = request.Name,
                Description = request.Description,
                BoxId = request.BoxId,
                StorageUnitId = request.StorageUnitId
            };

            db.InventoryItems.Add(item);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory-items/{item.Id}", item);
        })
        .WithName("CreateInventoryItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryItemRequest request, ApplicationDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id);
            if (item is null || item.DeletedOn != null)
                return Results.NotFound();

            if (request.BoxId.HasValue)
            {
                var box = await db.InventoryBoxes.FindAsync(request.BoxId.Value);
                if (box is null || box.DeletedOn != null)
                    return Results.BadRequest("Invalid box ID.");
            }

            if (request.StorageUnitId.HasValue)
            {
                var storageUnit = await db.InventoryStorageUnits.FindAsync(request.StorageUnitId.Value);
                if (storageUnit is null || storageUnit.DeletedOn != null)
                    return Results.BadRequest("Invalid storage unit ID.");
            }

            item.Name = request.Name;
            item.Description = request.Description;
            item.BoxId = request.BoxId;
            item.StorageUnitId = request.StorageUnitId;
            item.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateInventoryItem")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var item = await db.InventoryItems.FindAsync(id);
            if (item is null || item.DeletedOn != null)
                return Results.NotFound();

            item.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteInventoryItem")
        .RequireAuthorization();
    }
}

public record CreateInventoryItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    string? Description,
    int? BoxId,
    int? StorageUnitId);

public record UpdateInventoryItemRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    string? Description,
    int? BoxId,
    int? StorageUnitId);
