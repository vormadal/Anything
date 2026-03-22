using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Queries;

public record GetSuggestionCategoriesQuery : IRequest<List<SuggestionCategory>>;

public class GetSuggestionCategoriesHandler(IRepository<SuggestionCategory> repository)
    : IRequestHandler<GetSuggestionCategoriesQuery, List<SuggestionCategory>>
{
    public async Task<List<SuggestionCategory>> Handle(GetSuggestionCategoriesQuery query, CancellationToken ct = default)
    {
        return await repository.Query()
            .Where(c => c.DeletedOn == null)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);
    }
}
