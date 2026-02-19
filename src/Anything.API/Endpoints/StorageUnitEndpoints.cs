using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class StorageUnitEndpoints
{
    public static void MapStorageUnitEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/storageunits");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.StorageUnits
                .Where(s => s.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetStorageUnits")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.StorageUnits.FindAsync(id) is StorageUnit storageUnit && storageUnit.DeletedOn == null
                ? Results.Ok(storageUnit)
                : Results.NotFound();
        })
        .WithName("GetStorageUnitById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateStorageUnitRequest request, ApplicationDbContext db) =>
        {
            var storageUnit = new StorageUnit
            {
                Name = request.Name,
                Type = request.Type
            };

            db.StorageUnits.Add(storageUnit);
            await db.SaveChangesAsync();
            return Results.Created($"/api/storageunits/{storageUnit.Id}", storageUnit);
        })
        .WithName("CreateStorageUnit")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateStorageUnitRequest request, ApplicationDbContext db) =>
        {
            var storageUnit = await db.StorageUnits.FindAsync(id);
            if (storageUnit is null || storageUnit.DeletedOn != null)
                return Results.NotFound();

            storageUnit.Name = request.Name;
            storageUnit.Type = request.Type;
            storageUnit.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateStorageUnit")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var storageUnit = await db.StorageUnits.FindAsync(id);
            if (storageUnit is null || storageUnit.DeletedOn != null)
                return Results.NotFound();

            storageUnit.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteStorageUnit")
        .RequireAuthorization();
    }
}

public record CreateStorageUnitRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(100, ErrorMessage = "Type must be 100 characters or less.")]
    string? Type);

public record UpdateStorageUnitRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(100, ErrorMessage = "Type must be 100 characters or less.")]
    string? Type);
