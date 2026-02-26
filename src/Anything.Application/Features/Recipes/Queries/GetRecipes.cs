using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recipes.Queries;

public record GetRecipesQuery : IRequest<List<Recipe>>;

public class GetRecipesHandler(IRepository<Recipe> repository)
    : IRequestHandler<GetRecipesQuery, List<Recipe>>
{
    public async Task<List<Recipe>> Handle(GetRecipesQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(r => r.DeletedOn == null)
            .ToListAsync(ct);
    }
}
