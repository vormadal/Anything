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
        var importItems = command.Recommendations;

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
        foreach (var categoryName in importItems
            .Where(r => !r.Delete && r.Category is not null)
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

        foreach (var item in importItems)
        {
            if (item.Delete)
            {
                if (recommendations.TryGetValue(item.Name, out var toDelete))
                {
                    recommendationRepository.Remove(toDelete);
                    recommendations.Remove(item.Name);
                }

                continue;
            }

            var category = item.Category is not null ? categories[item.Category] : null;

            if (recommendations.TryGetValue(item.Name, out var existing))
            {
                existing.PreferredUnit = item.PreferredUnit;
                existing.Category = category;
                existing.ModifiedOn = now;
            }
            else
            {
                var newRecommendation = new ShoppingListRecommendation
                {
                    HouseholdId = householdContext.HouseholdId,
                    Name = item.Name,
                    PreferredUnit = item.PreferredUnit,
                    Category = category,
                    CreatedOn = now,
                };
                recommendationRepository.Add(newRecommendation);
                recommendations[item.Name] = newRecommendation;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
