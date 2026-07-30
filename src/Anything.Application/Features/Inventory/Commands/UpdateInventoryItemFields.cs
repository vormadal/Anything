using Anything.Application.Features.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record InventoryFieldInput(string Label, string Value);

/// <summary>Replaces an item's entire custom-field list, in the given order.</summary>
public record UpdateInventoryItemFieldsCommand(int ItemId, IReadOnlyList<InventoryFieldInput> Fields) : IRequest<IResult>;

public class UpdateInventoryItemFieldsHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryItemField> fieldRepository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<UpdateInventoryItemFieldsCommand, IResult>
{
    // Enforced here rather than relying solely on the request DTO's data
    // annotations, since the endpoint filter's validation may not recurse into
    // a nested list — matches the InventoryItemFieldConfiguration column limits.
    private const int LabelMaxLength = 100;
    private const int ValueMaxLength = 500;

    public async Task<IResult> Handle(UpdateInventoryItemFieldsCommand command, CancellationToken ct = default)
    {
        var itemExists = await itemRepository.Query()
            .AnyAsync(i => i.Id == command.ItemId && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId, ct);
        if (!itemExists)
            return Results.NotFound();

        if (command.Fields.Any(f =>
            string.IsNullOrWhiteSpace(f.Label) || f.Label.Length > LabelMaxLength ||
            string.IsNullOrWhiteSpace(f.Value) || f.Value.Length > ValueMaxLength))
        {
            return Results.BadRequest("Each field needs a label (up to 100 characters) and a value (up to 500 characters).");
        }

        var existing = await fieldRepository.Query()
            .Where(f => f.ItemId == command.ItemId)
            .ToListAsync(ct);
        foreach (var field in existing)
            fieldRepository.Remove(field);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var replacements = command.Fields
            .Select((input, index) => new InventoryItemField
            {
                ItemId = command.ItemId,
                Label = input.Label,
                Value = input.Value,
                SortOrder = index,
                CreatedOn = now
            })
            .ToList();
        fieldRepository.AddRange(replacements);

        await unitOfWork.SaveChanges(ct);
        return Results.Ok(replacements.Select(InventoryMapping.ToResponse));
    }
}
