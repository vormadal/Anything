using System.Security.Claims;
using Anything.API.Authorization;
using Anything.Application.Features.Recipes.Commands;
using Anything.Application.Features.Recipes.Queries;
using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;
using Microsoft.AspNetCore.Mvc;


namespace Anything.API.Endpoints;

public class RecipesQueryParameters
{
    public string? Search { get; set; }
    public string? Tag { get; set; }
}

public static class RecipeEndpoints
{
    private static ServingsType ParseServingsType(string? value) =>
        Enum.TryParse<ServingsType>(value, ignoreCase: true, out var parsed) ? parsed : ServingsType.People;

    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recipes");

        // Returns RecipeListItemResponse items — each carries the primary image
        // thumbnail URL and tag names inline so the list page renders a card from
        // one response instead of a per-card image + tag request.
        group.MapGet("/", async ([AsParameters] RecipesQueryParameters parameters, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipesQuery(parameters.Search, parameters.Tag));
        })
        .WithName("GetRecipes")
        .Produces<List<RecipeListItemResponse>>()
        .RequireAuthorization();

        group.MapGet("/tags", async (int? count, IMediator mediator) =>
        {
            return await mediator.Send(new GetTopRecipeTagsQuery(count ?? 10));
        })
        .WithName("GetTopRecipeTags")
        .Produces<List<Anything.Contracts.Recipes.TopTagResponse>>()
        .RequireAuthorization();

        group.MapGet("/tags/catalog", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeTagCatalogQuery());
        })
        .WithName("GetRecipeTagCatalog")
        .Produces<List<Anything.Contracts.Recipes.TopTagResponse>>()
        .RequireAuthorization();

        group.MapPut("/tags/{name}", async (string name, [FromBody] RenameRecipeTagRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new RenameRecipeTagCommand(name, request.NewName));
        })
        .WithName("RenameRecipeTag")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapDelete("/tags/{name}", async (string name, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeTagByNameCommand(name));
        })
        .WithName("DeleteRecipeTagByName")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapGet("/tags/export", async (IMediator mediator) =>
        {
            return await mediator.Send(new ExportRecipeTagsQuery());
        })
        .WithName("ExportRecipeTags")
        .Produces<ExportRecipeTagsResponse>(StatusCodes.Status200OK)
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapPost("/tags/import", async ([FromBody] ImportRecipeTagsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ImportRecipeTagsCommand(request.Recipes));
        })
        .WithName("ImportRecipeTags")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status400BadRequest)
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeByIdQuery(id));
        })
        .WithName("GetRecipeById")
        .Produces<Recipe>()
        .Produces(404)
        .RequireAuthorization();

        // Aggregate for the detail page: recipe + ingredients + steps + images +
        // tags in one response (the detail page previously fired five requests).
        group.MapGet("/{id}/details", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeDetailsQuery(id));
        })
        .WithName("GetRecipeDetails")
        .Produces<RecipeDetailResponse>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateRecipeRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateRecipeCommand(
                request.Name, request.Link, request.Notes,
                request.CookTimeMinutes, request.Servings, ParseServingsType(request.ServingsType)));
            return Results.Created($"/api/recipes/{result.Id}", result);
        })
        .WithName("CreateRecipe")
        .Produces<Recipe>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPost("/parse-url", async (ParseRecipeFromUrlRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ParseRecipeFromUrlCommand(request.Url));
        })
        .WithName("ParseRecipeFromUrl")
        .Produces<ParsedRecipeResponse>()
        .Produces(400)
        .Produces(422)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPost("/parse-text", async (ParseRecipeTextRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ParseRecipeFromTextCommand(request.Name, request.IngredientsText, request.StepsText));
        })
        .WithName("ParseRecipeFromText")
        .Produces<ParsedRecipeResponse>()
        .Produces(400)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPost("/{id}/reimport", async (int id, ReimportRecipeRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReimportRecipeCommand(
                id, request.ImportName, request.ImportIngredients, request.ImportSteps, request.ImportImages));
        })
        .WithName("ReimportRecipe")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .Produces(422)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPost("/import", async (ImportRecipeRequest request, IMediator mediator) =>
        {
            var ingredients = (request.Ingredients ?? [])
                .Select(i => new ImportRecipeIngredient(i.Name, i.Amount, i.Unit, i.Group))
                .ToList();
            var steps = (request.Steps ?? [])
                .Select(s => new ImportRecipeStep(s.Text, s.Order))
                .ToList();
            var result = await mediator.Send(new ImportRecipeCommand(
                request.Name, request.Link, request.Notes, ingredients, steps, request.ImageUrl,
                request.CookTimeMinutes, request.Servings, ParseServingsType(request.ServingsType)));
            return Results.Created($"/api/recipes/{result.Id}", result);
        })
        .WithName("ImportRecipe")
        .Produces<Recipe>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateRecipeRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecipeCommand(
                id, request.Name, request.Link, request.Notes,
                request.CookTimeMinutes, request.Servings, ParseServingsType(request.ServingsType)));
        })
        .WithName("UpdateRecipe")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeCommand(id));
        })
        .WithName("DeleteRecipe")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        // Ingredients
        group.MapGet("/{id}/ingredients", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeIngredientsQuery(id));
        })
        .WithName("GetRecipeIngredients")
        .Produces<List<RecipeIngredient>>()
        .RequireAuthorization();

        group.MapPost("/{id}/ingredients", async (int id, CreateRecipeIngredientRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddRecipeIngredientCommand(id, request.Name, request.Amount, request.Unit, request.Group));
        })
        .WithName("AddRecipeIngredient")
        .Produces<RecipeIngredient>(StatusCodes.Status201Created)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/ingredients/{ingredientId}", async (int id, int ingredientId, UpdateRecipeIngredientRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecipeIngredientCommand(id, ingredientId, request.Name, request.Amount, request.Unit, request.Group));
        })
        .WithName("UpdateRecipeIngredient")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/ingredients/reorder", async (int id, ReorderRecipeIngredientsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReorderRecipeIngredientsCommand(id, request.Ids));
        })
        .WithName("ReorderRecipeIngredients")
        .Produces(204)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/ingredients/{ingredientId}", async (int id, int ingredientId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeIngredientCommand(id, ingredientId));
        })
        .WithName("DeleteRecipeIngredient")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        // Steps
        group.MapGet("/{id}/steps", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeStepsQuery(id));
        })
        .WithName("GetRecipeSteps")
        .Produces<List<RecipeStep>>()
        .RequireAuthorization();

        group.MapPost("/{id}/steps", async (int id, CreateRecipeStepRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddRecipeStepCommand(id, request.Text, request.Order));
        })
        .WithName("AddRecipeStep")
        .Produces<RecipeStep>(StatusCodes.Status201Created)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/steps/{stepId}", async (int id, int stepId, UpdateRecipeStepRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecipeStepCommand(id, stepId, request.Text, request.Order));
        })
        .WithName("UpdateRecipeStep")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/steps/reorder", async (int id, ReorderRecipeStepsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReorderRecipeStepsCommand(id, request.Ids));
        })
        .WithName("ReorderRecipeSteps")
        .Produces(204)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/steps/{stepId}", async (int id, int stepId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeStepCommand(id, stepId));
        })
        .WithName("DeleteRecipeStep")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        // Images
        group.MapGet("/{id}/images", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeImagesQuery(id));
        })
        .WithName("GetRecipeImages")
        .Produces<List<RecipeImageResponse>>()
        .RequireAuthorization();

        group.MapPost("/{id}/images", async (int id, AddRecipeImageRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddRecipeImageCommand(id, request.Url));
        })
        .WithName("AddRecipeImage")
        .Produces(201)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPost("/{id}/images/upload", async (int id, IFormFile? file, IMediator mediator) =>
        {
            if (UploadEndpointValidation.ValidateFile(file) is { } fileError)
                return fileError;
            await using var stream = file!.OpenReadStream();
            return await mediator.Send(new UploadRecipeImageCommand(id, stream, file.FileName, file.ContentType, file.Length));
        })
        .WithName("UploadRecipeImage")
        .Produces(201)
        .Produces(400)
        .Produces(404)
        .RequireAuthorization()
        .DisableAntiforgery();

        group.MapDelete("/{id}/images/{imageId}", async (int id, int imageId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeImageCommand(id, imageId));
        })
        .WithName("DeleteRecipeImage")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        // Add ingredients to shopping list
        group.MapPost("/{id}/add-to-shopping-list", async (int id, AddToShoppingListRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddRecipeToShoppingListCommand(id, request.ShoppingListId, request.Multiplier));
        })
        .WithName("AddRecipeIngredientsToShoppingList")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        // Tags
        group.MapGet("/{id}/tags", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeTagsQuery(id));
        })
        .WithName("GetRecipeTags")
        .Produces<List<RecipeTag>>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/{id}/tags", async (int id, CreateRecipeTagRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddRecipeTagCommand(id, request.Name));
        })
        .WithName("AddRecipeTag")
        .Produces<RecipeTag>(StatusCodes.Status201Created)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/tags/{tagId}", async (int id, int tagId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeTagCommand(id, tagId));
        })
        .WithName("DeleteRecipeTag")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        // Shares
        group.MapGet("/{id}/shares", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeSharesQuery(id));
        })
        .WithName("GetRecipeShares")
        .Produces<List<RecipeShareResponse>>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/{id}/shares", async (int id, CreateRecipeShareRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new CreateRecipeShareTokenCommand(id, request.Expiry, request.TargetEmail, userId));
        })
        .WithName("CreateRecipeShare")
        .Produces<RecipeShareResponse>(StatusCodes.Status201Created)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/shares/{tokenId}", async (int id, int tokenId, IMediator mediator) =>
        {
            return await mediator.Send(new RevokeRecipeShareCommand(id, tokenId));
        })
        .WithName("RevokeRecipeShare")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();
    }
}
