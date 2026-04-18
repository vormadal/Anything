using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Inventory.Commands;

public record DeleteInventoryItemCommand(int Id) : IRequest<IResult>;

public class DeleteInventoryItemHandler(IRepository<InventoryItem> repository, IHouseholdContext householdContext, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteInventoryItemCommand, IResult>
{
    public async Task<IResult> Handle(DeleteInventoryItemCommand command, CancellationToken ct = default)
    {
        var item = await repository.Query()
            .Where(i => i.Id == command.Id && i.DeletedOn == null && i.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (item is null)
            return Results.NotFound();

        item.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
