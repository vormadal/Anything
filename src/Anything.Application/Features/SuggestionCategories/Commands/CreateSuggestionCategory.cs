using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record CreateSuggestionCategoryCommand(string Name) : IRequest<IResult>;

public class CreateSuggestionCategoryHandler(IRepository<SuggestionCategory> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateSuggestionCategoryCommand, IResult>
{
    public async Task<IResult> Handle(CreateSuggestionCategoryCommand command, CancellationToken ct = default)
    {
        var maxSortOrder = await repository.Query()
            .Where(c => c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId)
            .Select(c => (int?)c.SortOrder)
            .MaxAsync(ct) ?? -1;

        var category = new SuggestionCategory
        {
            HouseholdId = householdContext.HouseholdId,
            Name = command.Name,
            SortOrder = maxSortOrder + 1,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        };
        repository.Add(category);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/suggestion-categories/{category.Id}", category);
    }
}
