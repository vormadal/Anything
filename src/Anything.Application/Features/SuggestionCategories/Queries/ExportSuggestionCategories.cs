using Anything.Contracts.SuggestionCategories;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Queries;

public record ExportSuggestionCategoriesQuery : IRequest<ExportSuggestionCategoriesResponse>;

public class ExportSuggestionCategoriesHandler(IRepository<SuggestionCategory> repository, IHouseholdContext householdContext)
    : IRequestHandler<ExportSuggestionCategoriesQuery, ExportSuggestionCategoriesResponse>
{
    public async Task<ExportSuggestionCategoriesResponse> Handle(ExportSuggestionCategoriesQuery query, CancellationToken ct = default)
    {
        var items = await repository.Query().AsNoTracking()
            .Where(c => c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new SuggestionCategoryImportExportItem(c.Name))
            .ToListAsync(ct);

        return new ExportSuggestionCategoriesResponse(items);
    }
}
