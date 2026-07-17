using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Recommendations.Commands;

/// <summary>
/// Merges one or more near-duplicate recommendations into a single canonical one.
/// The <paramref name="TargetId"/> recommendation is kept (optionally updated with
/// the canonical name/category/unit); every <paramref name="SourceIds"/> row is
/// deleted. Existing shopping-list items are linked to recommendations only by name
/// and are intentionally left untouched.
/// </summary>
public record MergeRecommendationsCommand(
    int TargetId,
    IReadOnlyList<int> SourceIds,
    string? Name,
    int? CategoryId,
    string? PreferredUnit,
    bool? IncludeInSuggestions) : IRequest<IResult>;

public class MergeRecommendationsHandler(
    IRepository<ShoppingListRecommendation> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<MergeRecommendationsCommand, IResult>
{
    public async Task<IResult> Handle(MergeRecommendationsCommand command, CancellationToken ct = default)
    {
        var sourceIds = command.SourceIds.Distinct().ToList();
        if (sourceIds.Count == 0)
            return Results.BadRequest(RecommendationErrors.MergeSourcesRequired);
        if (sourceIds.Contains(command.TargetId))
            return Results.BadRequest(RecommendationErrors.MergeTargetInSources);

        var householdId = householdContext.HouseholdId;
        var ids = sourceIds.Append(command.TargetId).ToList();
        var members = await repository.Query()
            .Where(r => r.HouseholdId == householdId && ids.Contains(r.Id))
            .ToListAsync(ct);

        var target = members.FirstOrDefault(r => r.Id == command.TargetId);
        if (target is null || members.Count != ids.Count)
            return Results.NotFound(RecommendationErrors.MergeMembersNotFound);

        var canonicalName = string.IsNullOrWhiteSpace(command.Name) ? target.Name : command.Name.Trim();

        // Guard against colliding with the (HouseholdId, ShoppingListId, Name) unique
        // index. The sources are being deleted, so only a *non-merged* row of the same
        // scope and name is a real conflict.
        var conflict = await repository.Query().AnyAsync(r =>
            r.HouseholdId == householdId
            && r.Id != target.Id
            && !ids.Contains(r.Id)
            && r.ShoppingListId == target.ShoppingListId
            && r.Name == canonicalName, ct);
        if (conflict)
            return Results.Conflict(RecommendationErrors.MergeNameConflict);

        target.Name = canonicalName;
        if (command.CategoryId.HasValue)
            target.CategoryId = command.CategoryId;
        if (command.PreferredUnit is not null)
            target.PreferredUnit = string.IsNullOrWhiteSpace(command.PreferredUnit) ? null : command.PreferredUnit.Trim();
        if (command.IncludeInSuggestions.HasValue)
            target.IncludeInSuggestions = command.IncludeInSuggestions.Value;
        target.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var source in members.Where(r => r.Id != target.Id))
            repository.Remove(source);

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
