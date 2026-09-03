using Anything.Application.Features.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryBoxAttachmentsQuery(int BoxId) : IRequest<IResult>;

public class GetInventoryBoxAttachmentsHandler(
    IRepository<InventoryBox> boxRepository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext) : IRequestHandler<GetInventoryBoxAttachmentsQuery, IResult>
{
    private const string BoxNotFound = "Box not found.";

    public async Task<IResult> Handle(GetInventoryBoxAttachmentsQuery query, CancellationToken ct = default)
    {
        var boxExists = await boxRepository.Query().AsNoTracking()
            .AnyAsync(b => b.Id == query.BoxId && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId, ct);
        if (!boxExists)
            return Results.NotFound(BoxNotFound);

        var attachments = await attachmentRepository.Query().AsNoTracking()
            .Where(a => a.BoxId == query.BoxId && a.DeletedOn == null)
            .OrderBy(a => a.SortOrder)
            .ToListAsync(ct);

        var response = attachments.Select(a => InventoryAttachmentMapping.ToResponse(
            a, imageStorageService, $"/api/inventory-boxes/{query.BoxId}/attachments/{a.Id}/download"));

        return Results.Ok(response);
    }
}
