using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class InventoryStorageUnitEndpoints
{
    public static void MapInventoryStorageUnitEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory-storage-units");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.InventoryStorageUnits
                .Where(s => s.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetInventoryStorageUnits")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.InventoryStorageUnits.FindAsync(id) is InventoryStorageUnit storageUnit && storageUnit.DeletedOn == null
                ? Results.Ok(storageUnit)
                : Results.NotFound();
        })
        .WithName("GetInventoryStorageUnitById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateInventoryStorageUnitRequest request, ApplicationDbContext db) =>
        {
            var storageUnit = new InventoryStorageUnit
            {
                Name = request.Name,
                Type = request.Type
            };

            db.InventoryStorageUnits.Add(storageUnit);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory-storage-units/{storageUnit.Id}", storageUnit);
        })
        .WithName("CreateInventoryStorageUnit")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateInventoryStorageUnitRequest request, ApplicationDbContext db) =>
        {
            var storageUnit = await db.InventoryStorageUnits.FindAsync(id);
            if (storageUnit is null || storageUnit.DeletedOn != null)
                return Results.NotFound();

            storageUnit.Name = request.Name;
            storageUnit.Type = request.Type;
            storageUnit.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateInventoryStorageUnit")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var storageUnit = await db.InventoryStorageUnits.FindAsync(id);
            if (storageUnit is null || storageUnit.DeletedOn != null)
                return Results.NotFound();

            var hasActiveBoxes = await db.InventoryBoxes
                .AnyAsync(b => b.StorageUnitId == id && b.DeletedOn == null);
            var hasActiveItems = await db.InventoryItems
                .AnyAsync(i => i.StorageUnitId == id && i.DeletedOn == null);

            if (hasActiveBoxes || hasActiveItems)
                return Results.Conflict("Cannot delete storage unit while active boxes or items are associated with it.");

            storageUnit.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteInventoryStorageUnit")
        .RequireAuthorization();
    }
}

public record CreateInventoryStorageUnitRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(100, ErrorMessage = "Type must be 100 characters or less.")]
    string? Type);

public record UpdateInventoryStorageUnitRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(100, ErrorMessage = "Type must be 100 characters or less.")]
    string? Type);
