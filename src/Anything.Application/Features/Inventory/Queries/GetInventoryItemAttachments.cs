using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryItemAttachmentsQuery(int ItemId) : IRequest<IResult>;

public class GetInventoryItemAttachmentsHandler(
    IRepository<InventoryItem> itemRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<GetInventoryItemAttachmentsQuery, IResult>
{
    private const string ItemNotFound = "Item not found.";

    public async Task<IResult> Handle(GetInventoryItemAttachmentsQuery query, CancellationToken ct = default)
    {
        var itemExists = await itemRepository.Query().AsNoTracking()
            .AnyAsync(i => i.Id == query.ItemId && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId, ct);
        if (!itemExists)
            return Results.NotFound(ItemNotFound);

        var attachments = await attachmentRepository.Query().AsNoTracking()
            .Where(a => a.ItemId == query.ItemId && a.DeletedOn == null)
            .OrderBy(a => a.SortOrder)
            .ToListAsync(ct);

        var response = attachments.Select(a => InventoryAttachmentMapping.ToResponse(
            a, imageStorageService, $"/api/inventory-items/{query.ItemId}/attachments/{a.Id}/download"));

        return Results.Ok(response);
    }
}
