using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

/// <summary>
/// Removes every shared (null-list) suggestion for the household. List-specific
/// suggestions are left untouched. Mirror of <see cref="DeleteRecommendationsForListCommand"/>
/// for the shared scope, where there is no list to validate.
/// </summary>
public record DeleteSharedRecommendationsCommand : IRequest<IResult>;

public class DeleteSharedRecommendationsHandler(
    IRepository<ShoppingListRecommendation> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork)
    : IRequestHandler<DeleteSharedRecommendationsCommand, IResult>
{
    public async Task<IResult> Handle(DeleteSharedRecommendationsCommand command, CancellationToken ct = default)
    {
        var recommendations = await repository.Query()
            .Where(r => r.HouseholdId == householdContext.HouseholdId && r.ShoppingListId == null)
            .ToListAsync(ct);

        foreach (var recommendation in recommendations)
            repository.Remove(recommendation);

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
