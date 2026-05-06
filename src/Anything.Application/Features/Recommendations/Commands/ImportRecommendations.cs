using Anything.Contracts.Recommendations;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

public record ImportRecommendationsCommand(List<RecommendationImportExportItem> Recommendations) : IRequest<IResult>;

public class ImportRecommendationsHandler(
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IRepository<SuggestionCategory> categoryRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<ImportRecommendationsCommand, IResult>
{
    public async Task<IResult> Handle(ImportRecommendationsCommand command, CancellationToken ct = default)
    {
        var categories = await categoryRepository.Query()
            .Where(c => c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId)
            .ToDictionaryAsync(c => c.Name, ct);

        var recommendations = await recommendationRepository.Query()
            .Where(r => r.HouseholdId == householdContext.HouseholdId)
            .ToDictionaryAsync(r => r.Name, ct);

        var maxCategorySortOrder = categories.Values.Select(c => (int?)c.SortOrder).Max() ?? -1;
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var newCategoryIndex = 0;

        // Ensure all referenced categories exist before processing recommendations
        foreach (var categoryName in command.Recommendations
            .Where(r => r.Category is not null)
            .Select(r => r.Category!)
            .Distinct())
        {
            if (categories.ContainsKey(categoryName))
                continue;

            var newCategory = new SuggestionCategory
            {
                HouseholdId = householdContext.HouseholdId,
                Name = categoryName,
                SortOrder = maxCategorySortOrder + 1 + newCategoryIndex++,
                CreatedOn = now,
            };
            categoryRepository.Add(newCategory);
            categories[categoryName] = newCategory;
        }

        foreach (var item in command.Recommendations)
        {
            var category = item.Category is not null ? categories[item.Category] : null;

            if (recommendations.TryGetValue(item.Name, out var existing))
            {
                existing.PreferredUnit = item.PreferredUnit;
                existing.Category = category;
                existing.ModifiedOn = now;
            }
            else
            {
                recommendationRepository.Add(new ShoppingListRecommendation
                {
                    HouseholdId = householdContext.HouseholdId,
                    Name = item.Name,
                    PreferredUnit = item.PreferredUnit,
                    Category = category,
                    CreatedOn = now,
                });
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
