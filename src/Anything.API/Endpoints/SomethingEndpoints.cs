using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class SomethingEndpoints
{
    public static void MapSomethingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/somethings");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.Somethings
                .Where(s => s.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetSomethings")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.Somethings.FindAsync(id) is Something something && something.DeletedOn == null
                ? Results.Ok(something)
                : Results.NotFound();
        })
        .WithName("GetSomethingById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateSomethingRequest request, ApplicationDbContext db) =>
        {
            var something = new Something
            {
                Name = request.Name
            };

            db.Somethings.Add(something);
            await db.SaveChangesAsync();
            return Results.Created($"/api/somethings/{something.Id}", something);
        })
        .WithName("CreateSomething")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateSomethingRequest request, ApplicationDbContext db) =>
        {
            var something = await db.Somethings.FindAsync(id);
            if (something is null || something.DeletedOn != null)
                return Results.NotFound();

            something.Name = request.Name;
            something.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateSomething")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var something = await db.Somethings.FindAsync(id);
            if (something is null || something.DeletedOn != null)
                return Results.NotFound();

            something.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteSomething")
        .RequireAuthorization();
    }
}

public record CreateSomethingRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name);

public record UpdateSomethingRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name);
