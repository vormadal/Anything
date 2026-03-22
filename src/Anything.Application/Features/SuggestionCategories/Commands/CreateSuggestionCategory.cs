using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record CreateSuggestionCategoryCommand(string Name) : IRequest<IResult>;

public class CreateSuggestionCategoryHandler(IRepository<SuggestionCategory> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateSuggestionCategoryCommand, IResult>
{
    public async Task<IResult> Handle(CreateSuggestionCategoryCommand command, CancellationToken ct = default)
    {
        var maxSortOrder = await repository.Query()
            .Where(c => c.DeletedOn == null)
            .MaxAsync(c => (int?)c.SortOrder, ct) ?? -1;

        var category = new SuggestionCategory
        {
            Name = command.Name,
            SortOrder = maxSortOrder + 1,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime,
        };
        repository.Add(category);
        await unitOfWork.SaveChanges(ct);
        return Results.Created($"/api/suggestion-categories/{category.Id}", category);
    }
}
