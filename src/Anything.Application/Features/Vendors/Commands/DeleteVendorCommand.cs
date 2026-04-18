using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Vendors.Commands;

public record DeleteVendorCommand(int Id) : IRequest<IResult>;

public class DeleteVendorHandler(
    IRepository<Vendor> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<DeleteVendorCommand, IResult>
{
    public async Task<IResult> Handle(DeleteVendorCommand command, CancellationToken ct = default)
    {
        var vendor = await repository.Query()
            .Where(v => v.Id == command.Id && v.DeletedOn == null && v.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (vendor is null)
            return Results.NotFound();

        vendor.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
