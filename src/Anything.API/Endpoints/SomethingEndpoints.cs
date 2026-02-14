using Anything.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Anything.API.Endpoints;

public static class SomethingEndpoints
{
    private const string NameField = "Name";
    private const string NameRequiredMessage = "Name is required and cannot be empty or whitespace.";
    private const string NameMaxLengthMessage = "Name cannot exceed 200 characters.";
    private const int NameMaxLength = 200;

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
            var validationResult = ValidateName(request.Name);
            if (validationResult is not null)
                return validationResult;

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
            var validationResult = ValidateName(request.Name);
            if (validationResult is not null)
                return validationResult;

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

    private static IResult? ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                { NameField, [NameRequiredMessage] }
            });

        if (name.Length > NameMaxLength)
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                { NameField, [NameMaxLengthMessage] }
            });

        return null;
    }
}

public record CreateSomethingRequest(string Name);
public record UpdateSomethingRequest(string Name);
