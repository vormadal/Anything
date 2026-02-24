using System.ComponentModel.DataAnnotations;
using Anything.API.Data;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class RecipeEndpoints
{
    private const string RecipeNotFound = "Recipe not found.";
    private const string IngredientNotFound = "Ingredient not found.";
    private const string StepNotFound = "Step not found.";
    private const string ImageNotFound = "Image not found.";

    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recipes");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            return await db.Recipes
                .Where(r => r.DeletedOn == null)
                .ToListAsync();
        })
        .WithName("GetRecipes")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, ApplicationDbContext db) =>
        {
            return await db.Recipes.FindAsync(id) is Recipe recipe && recipe.DeletedOn == null
                ? Results.Ok(recipe)
                : Results.NotFound(RecipeNotFound);
        })
        .WithName("GetRecipeById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateRecipeRequest request, ApplicationDbContext db) =>
        {
            var recipe = new Recipe
            {
                Name = request.Name,
                Link = request.Link,
                Notes = request.Notes
            };

            db.Recipes.Add(recipe);
            await db.SaveChangesAsync();
            return Results.Created($"/api/recipes/{recipe.Id}", recipe);
        })
        .WithName("CreateRecipe")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateRecipeRequest request, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            recipe.Name = request.Name;
            recipe.Link = request.Link;
            recipe.Notes = request.Notes;
            recipe.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateRecipe")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            recipe.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteRecipe")
        .RequireAuthorization();

        // Ingredients
        group.MapGet("/{id}/ingredients", async (int id, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            var ingredients = await db.RecipeIngredients
                .Where(i => i.RecipeId == id && i.DeletedOn == null)
                .ToListAsync();
            return Results.Ok(ingredients);
        })
        .WithName("GetRecipeIngredients")
        .RequireAuthorization();

        group.MapPost("/{id}/ingredients", async (int id, CreateRecipeIngredientRequest request, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            var ingredient = new RecipeIngredient
            {
                RecipeId = id,
                Name = request.Name,
                Amount = request.Amount,
                Unit = request.Unit,
                Group = request.Group
            };

            db.RecipeIngredients.Add(ingredient);
            await db.SaveChangesAsync();
            return Results.Created($"/api/recipes/{id}/ingredients/{ingredient.Id}", ingredient);
        })
        .WithName("AddRecipeIngredient")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/ingredients/{ingredientId}", async (int id, int ingredientId, UpdateRecipeIngredientRequest request, ApplicationDbContext db) =>
        {
            var ingredient = await db.RecipeIngredients.FindAsync(ingredientId);
            if (ingredient is null || ingredient.DeletedOn != null || ingredient.RecipeId != id)
                return Results.NotFound(IngredientNotFound);

            ingredient.Name = request.Name;
            ingredient.Amount = request.Amount;
            ingredient.Unit = request.Unit;
            ingredient.Group = request.Group;
            ingredient.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateRecipeIngredient")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/ingredients/{ingredientId}", async (int id, int ingredientId, ApplicationDbContext db) =>
        {
            var ingredient = await db.RecipeIngredients.FindAsync(ingredientId);
            if (ingredient is null || ingredient.DeletedOn != null || ingredient.RecipeId != id)
                return Results.NotFound(IngredientNotFound);

            ingredient.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteRecipeIngredient")
        .RequireAuthorization();

        // Steps
        group.MapGet("/{id}/steps", async (int id, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            var steps = await db.RecipeSteps
                .Where(s => s.RecipeId == id && s.DeletedOn == null)
                .OrderBy(s => s.Order)
                .ToListAsync();
            return Results.Ok(steps);
        })
        .WithName("GetRecipeSteps")
        .RequireAuthorization();

        group.MapPost("/{id}/steps", async (int id, CreateRecipeStepRequest request, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            var step = new RecipeStep
            {
                RecipeId = id,
                Text = request.Text,
                Order = request.Order
            };

            db.RecipeSteps.Add(step);
            await db.SaveChangesAsync();
            return Results.Created($"/api/recipes/{id}/steps/{step.Id}", step);
        })
        .WithName("AddRecipeStep")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/steps/{stepId}", async (int id, int stepId, UpdateRecipeStepRequest request, ApplicationDbContext db) =>
        {
            var step = await db.RecipeSteps.FindAsync(stepId);
            if (step is null || step.DeletedOn != null || step.RecipeId != id)
                return Results.NotFound(StepNotFound);

            step.Text = request.Text;
            step.Order = request.Order;
            step.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateRecipeStep")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/steps/{stepId}", async (int id, int stepId, ApplicationDbContext db) =>
        {
            var step = await db.RecipeSteps.FindAsync(stepId);
            if (step is null || step.DeletedOn != null || step.RecipeId != id)
                return Results.NotFound(StepNotFound);

            step.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteRecipeStep")
        .RequireAuthorization();

        // Images
        group.MapGet("/{id}/images", async (int id, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            var images = await db.RecipeImages
                .Where(i => i.RecipeId == id && i.DeletedOn == null)
                .ToListAsync();
            return Results.Ok(images);
        })
        .WithName("GetRecipeImages")
        .RequireAuthorization();

        group.MapPost("/{id}/images", async (int id, CreateRecipeImageRequest request, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            var image = new RecipeImage
            {
                RecipeId = id,
                Url = request.Url
            };

            db.RecipeImages.Add(image);
            await db.SaveChangesAsync();
            return Results.Created($"/api/recipes/{id}/images/{image.Id}", image);
        })
        .WithName("AddRecipeImage")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/images/{imageId}", async (int id, int imageId, ApplicationDbContext db) =>
        {
            var image = await db.RecipeImages.FindAsync(imageId);
            if (image is null || image.DeletedOn != null || image.RecipeId != id)
                return Results.NotFound(ImageNotFound);

            image.DeletedOn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("DeleteRecipeImage")
        .RequireAuthorization();

        // Add ingredients to shopping list
        group.MapPost("/{id}/add-to-shopping-list", async (int id, AddToShoppingListRequest request, ApplicationDbContext db) =>
        {
            var recipe = await db.Recipes.FindAsync(id);
            if (recipe is null || recipe.DeletedOn != null)
                return Results.NotFound(RecipeNotFound);

            var shoppingList = await db.ShoppingLists.FindAsync(request.ShoppingListId);
            if (shoppingList is null || shoppingList.DeletedOn != null)
                return Results.NotFound("Shopping list not found.");

            var ingredients = await db.RecipeIngredients
                .Where(i => i.RecipeId == id && i.DeletedOn == null)
                .ToListAsync();

            var itemNames = ingredients.Select(ingredient => string.IsNullOrWhiteSpace(ingredient.Unit)
                ? $"{ingredient.Amount:0.##} {ingredient.Name}"
                : $"{ingredient.Amount:0.##} {ingredient.Unit} {ingredient.Name}").ToList();

            var itemNamesLower = itemNames.Select(n => n.ToLower()).ToHashSet();
            var existingRecommendations = await db.ShoppingListRecommendations
                .Where(r => r.DeletedOn == null && itemNamesLower.Contains(r.Name.ToLower()))
                .Select(r => r.Name.ToLower())
                .ToHashSetAsync();

            foreach (var itemName in itemNames)
            {
                db.ShoppingListItems.Add(new ShoppingListItem
                {
                    ShoppingListId = request.ShoppingListId,
                    Name = itemName
                });

                var nameNormalized = itemName.Trim();
                if (!existingRecommendations.Contains(nameNormalized.ToLower()))
                {
                    db.ShoppingListRecommendations.Add(new ShoppingListRecommendation
                    {
                        Name = nameNormalized,
                        IsApproved = false
                    });
                    existingRecommendations.Add(nameNormalized.ToLower());
                }
            }

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Results.Problem("A database error occurred while saving the shopping list items.");
            }
            return Results.NoContent();
        })
        .WithName("AddRecipeIngredientsToShoppingList")
        .WithParameterValidation()
        .RequireAuthorization();
    }
}

public record CreateRecipeRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(500, ErrorMessage = "Link must be at most 500 characters.")]
    [Url(ErrorMessage = "Link must be a valid URL.")]
    string? Link,
    [StringLength(5000, ErrorMessage = "Notes must be at most 5000 characters.")]
    string? Notes);

public record UpdateRecipeRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [StringLength(500, ErrorMessage = "Link must be at most 500 characters.")]
    [Url(ErrorMessage = "Link must be a valid URL.")]
    string? Link,
    [StringLength(5000, ErrorMessage = "Notes must be at most 5000 characters.")]
    string? Notes);

public record CreateRecipeIngredientRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Range(0.001, double.MaxValue, ErrorMessage = "Amount must be greater than 0.")]
    decimal Amount,
    [StringLength(100, ErrorMessage = "Unit must be at most 100 characters.")]
    string? Unit,
    [StringLength(200, ErrorMessage = "Group must be at most 200 characters.")]
    string? Group);

public record UpdateRecipeIngredientRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Range(0.001, double.MaxValue, ErrorMessage = "Amount must be greater than 0.")]
    decimal Amount,
    [StringLength(100, ErrorMessage = "Unit must be at most 100 characters.")]
    string? Unit,
    [StringLength(200, ErrorMessage = "Group must be at most 200 characters.")]
    string? Group);

public record CreateRecipeStepRequest(
    [Required(ErrorMessage = "Text is required.")]
    [StringLength(5000, MinimumLength = 1, ErrorMessage = "Text must be between 1 and 5000 characters.")]
    string Text,
    int Order);

public record UpdateRecipeStepRequest(
    [Required(ErrorMessage = "Text is required.")]
    [StringLength(5000, MinimumLength = 1, ErrorMessage = "Text must be between 1 and 5000 characters.")]
    string Text,
    int Order);

public record CreateRecipeImageRequest(
    [Required(ErrorMessage = "Url is required.")]
    [StringLength(1000, MinimumLength = 1, ErrorMessage = "Url must be between 1 and 1000 characters.")]
    [Url(ErrorMessage = "Url must be a valid URL.")]
    string Url);

public record AddToShoppingListRequest(
    int ShoppingListId);
