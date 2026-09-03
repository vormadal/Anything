using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipeByIdQuery(int Id) : IRequest<IResult>;

public class GetRecipeByIdHandler(IRepository<Recipe> repository, IHouseholdContext householdContext)
    : IRequestHandler<GetRecipeByIdQuery, IResult>
{
    private const string RecipeNotFound = "Recipe not found.";

    public async Task<IResult> Handle(GetRecipeByIdQuery query, CancellationToken ct = default)
    {
        var recipe = await repository.Query().AsNoTracking()
            .Where(r => r.Id == query.Id && r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        return recipe is not null ? Results.Ok(recipe) : Results.NotFound(RecipeNotFound);
    }
}
