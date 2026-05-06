using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.ShoppingLists.Queries;

public record GetShoppingListItemsQuery(int ShoppingListId) : IRequest<IResult>;

public class GetShoppingListItemsHandler(
    IRepository<ShoppingList> listRepository,
    IRepository<ShoppingListItem> itemRepository,
    IRepository<ShoppingListRecommendation> recommendationRepository,
    IRepository<SuggestionCategory> categoryRepository,
    IHouseholdContext householdContext) : IRequestHandler<GetShoppingListItemsQuery, IResult>
{
    public async Task<IResult> Handle(GetShoppingListItemsQuery query, CancellationToken ct = default)
    {
        var list = await listRepository.Query()
            .Where(l => l.Id == query.ShoppingListId && l.DeletedOn == null && l.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (list is null)
            return Results.NotFound("Shopping list not found.");

        var householdId = householdContext.HouseholdId;
        var items = await (
            from item in itemRepository.Query()
            where item.ShoppingListId == query.ShoppingListId && item.CompletedOn == null
            join rec in recommendationRepository.Query()
                    .Where(r => r.DeletedOn == null && r.HouseholdId == householdId)
                on item.Name.ToLower() equals rec.Name.ToLower() into recs
            from rec in recs.DefaultIfEmpty()
            join cat in categoryRepository.Query().Where(c => c.DeletedOn == null)
                on (int?)rec.CategoryId equals cat.Id into cats
            from cat in cats.DefaultIfEmpty()
            orderby item.IsChecked, (int?)cat.SortOrder, item.CreatedOn
            select item
        ).ToListAsync(ct);

        return Results.Ok(items);
    }
}
