using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record DeleteSuggestionCategoryCommand(int Id) : IRequest<IResult>;

public class DeleteSuggestionCategoryHandler(IRepository<SuggestionCategory> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteSuggestionCategoryCommand, IResult>
{
    public async Task<IResult> Handle(DeleteSuggestionCategoryCommand command, CancellationToken ct = default)
    {
        var category = await repository.Query()
            .Where(c => c.Id == command.Id && c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (category is null)
            return Results.NotFound(SuggestionCategoryErrors.NotFound);

        category.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
