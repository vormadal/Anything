using Anything.API.Data;
using Microsoft.EntityFrameworkCore;

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
        .WithName("GetSomethings");

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.Somethings.FindAsync(id) is Something something && something.DeletedOn == null
                ? Results.Ok(something)
                : Results.NotFound();
        })
        .WithName("GetSomethingById");

        group.MapPost("/", async (CreateSomethingRequest request, ApplicationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Name", ["Name is required and cannot be empty or whitespace."] }
                });

            if (request.Name.Length > 200)
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Name", ["Name cannot exceed 200 characters."] }
                });

            var something = new Something
            {
                Name = request.Name
            };

            db.Somethings.Add(something);
            await db.SaveChangesAsync();
            return Results.Created($"/api/somethings/{something.Id}", something);
        })
        .WithName("CreateSomething");

        group.MapPut("/{id}", async (int id, UpdateSomethingRequest request, ApplicationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Name", ["Name is required and cannot be empty or whitespace."] }
                });

            if (request.Name.Length > 200)
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    { "Name", ["Name cannot exceed 200 characters."] }
                });

            var something = await db.Somethings.FindAsync(id);
            if (something is null || something.DeletedOn != null)
                return Results.NotFound();

            something.Name = request.Name;
            something.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateSomething");

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var something = await db.Somethings.FindAsync(id);
            if (something is null || something.DeletedOn != null)
                return Results.NotFound();

            something.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteSomething");
    }
}

public record CreateSomethingRequest(string Name);
public record UpdateSomethingRequest(string Name);
