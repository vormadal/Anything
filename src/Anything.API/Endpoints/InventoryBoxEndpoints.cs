using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class InventoryBoxEndpoints
{
    public static void MapInventoryBoxEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory-boxes");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.InventoryBoxes
                .Where(b => b.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetInventoryBoxes")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.InventoryBoxes.FindAsync(id) is InventoryBox box && box.DeletedOn == null
                ? Results.Ok(box)
                : Results.NotFound();
        })
        .WithName("GetInventoryBoxById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryBoxRequest request, ApplicationDbContext db) =>
        {
            if (request.StorageUnitId.HasValue)
            {
                var storageUnit = await db.InventoryStorageUnits.FindAsync(request.StorageUnitId.Value);
                if (storageUnit is null || storageUnit.DeletedOn != null)
                    return Results.BadRequest("Invalid storage unit ID.");
            }

            var box = new InventoryBox
            {
                Number = request.Number,
                StorageUnitId = request.StorageUnitId
            };

            db.InventoryBoxes.Add(box);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory-boxes/{box.Id}", box);
        })
        .WithName("CreateInventoryBox")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryBoxRequest request, ApplicationDbContext db) =>
        {
            var box = await db.InventoryBoxes.FindAsync(id);
            if (box is null || box.DeletedOn != null)
                return Results.NotFound();

            if (request.StorageUnitId.HasValue)
            {
                var storageUnit = await db.InventoryStorageUnits.FindAsync(request.StorageUnitId.Value);
                if (storageUnit is null || storageUnit.DeletedOn != null)
                    return Results.BadRequest("Invalid storage unit ID.");
            }

            box.Number = request.Number;
            box.StorageUnitId = request.StorageUnitId;
            box.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateInventoryBox")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var box = await db.InventoryBoxes.FindAsync(id);
            if (box is null || box.DeletedOn != null)
                return Results.NotFound();

            box.DeletedOn = DateTime.UtcNow;

            var itemsInBox = await db.InventoryItems
                .Where(i => i.BoxId == id && i.DeletedOn == null)
                .ToListAsync();

            foreach (var item in itemsInBox)
            {
                item.BoxId = null;
                item.ModifiedOn = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteInventoryBox")
        .RequireAuthorization();
    }
}

public record CreateInventoryBoxRequest(
    [Required(ErrorMessage = "Number is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Number must be a positive integer.")]
    int Number,
    int? StorageUnitId);

public record UpdateInventoryBoxRequest(
    [Required(ErrorMessage = "Number is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Number must be a positive integer.")]
    int Number,
    int? StorageUnitId);
