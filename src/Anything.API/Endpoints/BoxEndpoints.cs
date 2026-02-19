using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class BoxEndpoints
{
    public static void MapBoxEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/boxes");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.Boxes
                .Where(b => b.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetBoxes")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.Boxes.FindAsync(id) is Box box && box.DeletedOn == null
                ? Results.Ok(box)
                : Results.NotFound();
        })
        .WithName("GetBoxById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateBoxRequest request, ApplicationDbContext db) =>
        {
            var box = new Box
            {
                Number = request.Number,
                StorageUnitId = request.StorageUnitId
            };

            db.Boxes.Add(box);
            await db.SaveChangesAsync();
            return Results.Created($"/api/boxes/{box.Id}", box);
        })
        .WithName("CreateBox")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateBoxRequest request, ApplicationDbContext db) =>
        {
            var box = await db.Boxes.FindAsync(id);
            if (box is null || box.DeletedOn != null)
                return Results.NotFound();

            box.Number = request.Number;
            box.StorageUnitId = request.StorageUnitId;
            box.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateBox")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var box = await db.Boxes.FindAsync(id);
            if (box is null || box.DeletedOn != null)
                return Results.NotFound();

            box.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteBox")
        .RequireAuthorization();
    }
}

public record CreateBoxRequest(
    [Required(ErrorMessage = "Number is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Number must be a positive integer.")]
    int Number,
    int? StorageUnitId);

public record UpdateBoxRequest(
    [Required(ErrorMessage = "Number is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Number must be a positive integer.")]
    int Number,
    int? StorageUnitId);
