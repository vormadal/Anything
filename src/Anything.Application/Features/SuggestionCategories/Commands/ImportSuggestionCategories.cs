using Anything.Contracts.SuggestionCategories;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record ImportSuggestionCategoriesCommand(List<SuggestionCategoryImportExportItem> Categories) : IRequest<IResult>;

public class ImportSuggestionCategoriesHandler(
    IRepository<SuggestionCategory> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<ImportSuggestionCategoriesCommand, IResult>
{
    public async Task<IResult> Handle(ImportSuggestionCategoriesCommand command, CancellationToken ct = default)
    {
        var existingNames = await repository.Query()
            .Where(c => c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId)
            .Select(c => c.Name)
            .ToHashSetAsync(ct);

        var maxSortOrder = await repository.Query()
            .Where(c => c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId)
            .Select(c => (int?)c.SortOrder)
            .MaxAsync(ct) ?? -1;

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var newIndex = 0;

        foreach (var item in command.Categories)
        {
            if (existingNames.Contains(item.Name))
                continue;

            repository.Add(new SuggestionCategory
            {
                HouseholdId = householdContext.HouseholdId,
                Name = item.Name,
                SortOrder = maxSortOrder + 1 + newIndex,
                CreatedOn = now,
            });
            newIndex++;
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
