using Anything.Application.Features.Recipes.Commands;
using Anything.Application.Features.Recipes.Queries;
using Anything.Contracts.Recipes;
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
        .RequireAuthorization();

        group.MapPost("/{id}/images/upload", async (int id, IFormFile file, IMediator mediator) =>
        {
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
            return await mediator.Send(new AddRecipeToShoppingListCommand(id, request.ShoppingListId));
        })
        .WithName("AddRecipeIngredientsToShoppingList")
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
