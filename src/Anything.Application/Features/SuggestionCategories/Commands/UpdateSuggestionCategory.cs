using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record UpdateSuggestionCategoryCommand(int Id, string Name) : IRequest<IResult>;

public class UpdateSuggestionCategoryHandler(IRepository<SuggestionCategory> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateSuggestionCategoryCommand, IResult>
{
    public async Task<IResult> Handle(UpdateSuggestionCategoryCommand command, CancellationToken ct = default)
    {
        var category = await repository.Query()
            .Where(c => c.Id == command.Id && c.DeletedOn == null && c.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (category is null)
            return Results.NotFound(SuggestionCategoryErrors.NotFound);

        category.Name = command.Name;
        category.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
