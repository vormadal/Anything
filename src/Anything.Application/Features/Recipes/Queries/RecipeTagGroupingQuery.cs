using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;

namespace Anything.Application.Features.Recipes.Queries;

internal static class RecipeTagGroupingQuery
{
    internal record TagGroup(string Name, int Count);

    /// <summary>
    /// Distinct tag names (case-insensitive) with usage counts, scoped to the
    /// current household's non-deleted recipes. Shared by the "top tags" and
    /// "full tag catalog" queries so the join/group logic isn't duplicated.
    /// </summary>
    internal static IQueryable<TagGroup> GroupedByHousehold(
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
            .GroupBy(t => t.Name.ToLower())
            .Select(g => new TagGroup(g.Key, g.Count()));
    }
}
