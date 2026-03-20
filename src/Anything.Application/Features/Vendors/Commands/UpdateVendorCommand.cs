using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Vendors.Commands;

public record UpdateVendorCommand(int Id, string Name, string? Website) : IRequest<IResult>;

public class UpdateVendorHandler(
    IRepository<Vendor> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateVendorCommand, IResult>
{
    public async Task<IResult> Handle(UpdateVendorCommand command, CancellationToken ct = default)
    {
        var vendor = await repository.GetById(command.Id);
        if (vendor is null || vendor.DeletedOn != null)
            return Results.NotFound();

        vendor.Name = command.Name;
        vendor.Website = command.Website;
        vendor.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
