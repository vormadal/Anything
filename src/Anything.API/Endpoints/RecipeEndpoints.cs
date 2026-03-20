using Anything.Application.Features.Recipes.Commands;
using Anything.Application.Features.Recipes.Queries;
using Anything.Contracts.Recipes;
using Anything.Core.Entities;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;


namespace Anything.API.Endpoints;

public static class RecipeEndpoints
{
    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recipes");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipesQuery());
        })
        .WithName("GetRecipes")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeByIdQuery(id));
        })
        .WithName("GetRecipeById")
        .RequireAuthorization();

        group.MapPost("/", async (CreateRecipeRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateRecipeCommand(request.Name, request.Link, request.Notes));
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
                request.Name, request.Link, request.Notes, ingredients, steps, request.ImageUrl));
            return Results.Created($"/api/recipes/{result.Id}", result);
        })
        .WithName("ImportRecipe")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateRecipeRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecipeCommand(id, request.Name, request.Link, request.Notes));
        })
        .WithName("UpdateRecipe")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeCommand(id));
        })
        .WithName("DeleteRecipe")
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
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/ingredients/{ingredientId}", async (int id, int ingredientId, UpdateRecipeIngredientRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecipeIngredientCommand(id, ingredientId, request.Name, request.Amount, request.Unit, request.Group));
        })
        .WithName("UpdateRecipeIngredient")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/ingredients/reorder", async (int id, ReorderRecipeIngredientsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReorderRecipeIngredientsCommand(id, request.Ids));
        })
        .WithName("ReorderRecipeIngredients")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/ingredients/{ingredientId}", async (int id, int ingredientId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeIngredientCommand(id, ingredientId));
        })
        .WithName("DeleteRecipeIngredient")
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
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/steps/{stepId}", async (int id, int stepId, UpdateRecipeStepRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecipeStepCommand(id, stepId, request.Text, request.Order));
        })
        .WithName("UpdateRecipeStep")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/steps/reorder", async (int id, ReorderRecipeStepsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReorderRecipeStepsCommand(id, request.Ids));
        })
        .WithName("ReorderRecipeSteps")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/steps/{stepId}", async (int id, int stepId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeStepCommand(id, stepId));
        })
        .WithName("DeleteRecipeStep")
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
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPost("/{id}/images/upload", async (int id, IFormFile? file, IMediator mediator) =>
        {
            if (file == null || file.Length == 0)
                return Results.BadRequest("No file uploaded or file is empty.");
            await using var stream = file.OpenReadStream();
            return await mediator.Send(new UploadRecipeImageCommand(id, stream, file.FileName, file.ContentType, file.Length));
        })
        .WithName("UploadRecipeImage")
        .RequireAuthorization()
        .DisableAntiforgery();

        group.MapDelete("/{id}/images/{imageId}", async (int id, int imageId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeImageCommand(id, imageId));
        })
        .WithName("DeleteRecipeImage")
        .RequireAuthorization();

        // Add ingredients to shopping list
        group.MapPost("/{id}/add-to-shopping-list", async (int id, AddToShoppingListRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddRecipeToShoppingListCommand(id, request.ShoppingListId, request.Multiplier));
        })
        .WithName("AddRecipeIngredientsToShoppingList")
        .WithParameterValidation()
        .RequireAuthorization();

        // Tags
        group.MapGet("/{id}/tags", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new GetRecipeTagsQuery(id));
        })
        .WithName("GetRecipeTags")
        .RequireAuthorization();

        group.MapPost("/{id}/tags", async (int id, CreateRecipeTagRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new AddRecipeTagCommand(id, request.Name));
        })
        .WithName("AddRecipeTag")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/tags/{tagId}", async (int id, int tagId, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecipeTagCommand(id, tagId));
        })
        .WithName("DeleteRecipeTag")
        .RequireAuthorization();
    }
}
