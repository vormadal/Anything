using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Vendors.Commands;

public record UpdateVendorCommand(int Id, string Name, string? Website) : IRequest<IResult>;

public class UpdateVendorHandler(
    IRepository<Vendor> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateVendorCommand, IResult>
{
    public async Task<IResult> Handle(UpdateVendorCommand command, CancellationToken ct = default)
    {
        var vendor = await repository.Query()
            .Where(v => v.Id == command.Id && v.DeletedOn == null && v.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (vendor is null)
            return Results.NotFound();

        vendor.Name = command.Name;
        vendor.Website = command.Website;
        vendor.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
