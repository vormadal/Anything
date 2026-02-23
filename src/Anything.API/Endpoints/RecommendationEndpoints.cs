using System.ComponentModel.DataAnnotations;
using Anything.API.Constants;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Anything.API.Endpoints;

public static class RecommendationEndpoints
{
    private const string RecommendationNotFound = "Recommendation not found.";

    public static void MapRecommendationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shopping-list-recommendations");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.ShoppingListRecommendations
                .Where(r => r.IsApproved && r.DeletedOn == null)
                .OrderBy(r => r.Name)
                .ToListAsync();
        })
        .WithName("GetApprovedRecommendations")
        .RequireAuthorization();

        group.MapGet("/pending", async (ApplicationDbContext db) =>
        {
            return await db.ShoppingListRecommendations
                .Where(r => !r.IsApproved && r.DeletedOn == null)
                .OrderBy(r => r.Name)
                .ToListAsync();
        })
        .WithName("GetPendingRecommendations")
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/{id}/approve", async (int id, ApplicationDbContext db) =>
        {
            var recommendation = await db.ShoppingListRecommendations.FindAsync(id);
            if (recommendation is null || recommendation.DeletedOn != null)
                return Results.NotFound(RecommendationNotFound);

            recommendation.IsApproved = true;
            recommendation.ModifiedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("ApproveRecommendation")
        .RequireAuthorization(UserRoles.Admin);

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var recommendation = await db.ShoppingListRecommendations.FindAsync(id);
            if (recommendation is null || recommendation.DeletedOn != null)
                return Results.NotFound(RecommendationNotFound);

            recommendation.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteRecommendation")
        .RequireAuthorization(UserRoles.Admin);
    }
}
