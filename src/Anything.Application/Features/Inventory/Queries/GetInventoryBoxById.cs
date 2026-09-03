using Anything.Application.Features.Inventory;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Queries;

public record GetInventoryBoxByIdQuery(int Id) : IRequest<IResult>;

public class GetInventoryBoxByIdHandler(
    IRepository<InventoryBox> repository,
    IRepository<InventoryAttachment> attachmentRepository,
    IImageStorageService imageStorageService,
    IHouseholdContext householdContext)
    : IRequestHandler<GetInventoryBoxByIdQuery, IResult>
{
    public async Task<IResult> Handle(GetInventoryBoxByIdQuery query, CancellationToken ct = default)
    {
        var box = await repository.Query().AsNoTracking()
            .Where(b => b.Id == query.Id && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (box is null)
            return Results.NotFound();

        // InventoryBoxResponse is shared with the list endpoint, so the field has to mean the same
        // thing here rather than always coming back null.
        var thumbnails = await InventoryThumbnailLookup.Load(
            attachmentRepository,
            imageStorageService,
            InventoryAttachmentOwner.Box,
            [box.Id],
            ct);

        return Results.Ok(InventoryMapping.ToResponse(box, thumbnails.GetValueOrDefault(box.Id)));
    }
}
