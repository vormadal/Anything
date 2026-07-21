using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;

namespace Anything.Application.Features.Recipes.Queries;

internal static class RecipeTagGroupingQuery
{
    /// <summary>
    /// Non-deleted tags grouped by case-insensitive name, scoped to the current
    /// household's non-deleted recipes. Shared by the "top tags" and "full tag
    /// catalog" queries so the join/group logic isn't duplicated. Callers project
    /// the grouping themselves (e.g. into an anonymous type) — EF Core cannot
    /// reliably translate a query that projects into a named record type here
    /// and then composes further OrderBy/Take on top of it.
    /// </summary>
    internal static IQueryable<IGrouping<string, RecipeTag>> GroupedByHousehold(
        IRepository<RecipeTag> tagRepository,
        IRepository<Recipe> recipeRepository,
        IHouseholdContext householdContext)
    {
        return tagRepository.Query()
            .Where(t => t.DeletedOn == null)
            .Join(
                recipeRepository.Query().Where(r => r.DeletedOn == null && r.HouseholdId == householdContext.HouseholdId),
                t => t.RecipeId,
                r => r.Id,
                (t, r) => t)
            .GroupBy(t => t.Name.ToLower());
    }
}
