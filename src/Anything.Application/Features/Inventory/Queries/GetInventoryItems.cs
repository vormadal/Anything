using Anything.Application.Features.Inventory;
using Anything.Contracts.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryItemsQuery : IRequest<List<InventoryItemSummaryResponse>>;

public class GetInventoryItemsHandler(
    IRepository<InventoryItem> repository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryItemsQuery, List<InventoryItemSummaryResponse>>
{
    public async Task<List<InventoryItemSummaryResponse>> Handle(GetInventoryItemsQuery query, CancellationToken ct = default)
    {
        var items = await repository.Query()
            .Where(i => i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId)
            .ToListAsync(ct);

        var thumbnails = await InventoryThumbnailLookup.Load(
            attachmentRepository,
            imageStorageService,
            InventoryAttachmentOwner.Item,
            items.Select(i => i.Id).ToList(),
            ct);

        return items.Select(i => InventoryMapping.ToSummary(i, thumbnails.GetValueOrDefault(i.Id))).ToList();
    }
}
