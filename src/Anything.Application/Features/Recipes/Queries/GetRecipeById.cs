using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeByIdQuery(int Id) : IRequest<IResult>;

public class GetRecipeByIdHandler(IRepository<Recipe> repository)
    : IRequestHandler<GetRecipeByIdQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeByIdQuery query, CancellationToken ct = default)
    {
        return await repository.GetById(query.Id) is Recipe recipe && recipe.DeletedOn == null
            ? Results.Ok(recipe)
            : Results.NotFound(RecipeNotFound);
    }
}
