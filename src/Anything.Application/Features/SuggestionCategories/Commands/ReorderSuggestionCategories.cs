using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record ReorderSuggestionCategoriesCommand(List<int> Ids) : IRequest<IResult>;

public class ReorderSuggestionCategoriesHandler(IRepository<SuggestionCategory> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork)
    : IRequestHandler<ReorderSuggestionCategoriesCommand, IResult>
{
    public async Task<IResult> Handle(ReorderSuggestionCategoriesCommand command, CancellationToken ct = default)
    {
        var categories = await repository.Query()
            .Where(c => c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId && command.Ids.Contains(c.Id))
            .ToListAsync(ct);

        for (var i = 0; i < command.Ids.Count; i++)
        {
            var category = categories.FirstOrDefault(c => c.Id == command.Ids[i]);
            if (category != null)
            {
                category.SortOrder = i;
            }
        }

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
