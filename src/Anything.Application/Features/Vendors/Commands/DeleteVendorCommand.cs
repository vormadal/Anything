using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Vendors.Commands;

public record DeleteVendorCommand(int Id) : IRequest<IResult>;

public class DeleteVendorHandler(
    IRepository<Vendor> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<DeleteVendorCommand, IResult>
{
    public async Task<IResult> Handle(DeleteVendorCommand command, CancellationToken ct = default)
    {
        var vendor = await repository.GetById(command.Id);
        if (vendor is null || vendor.DeletedOn != null)
            return Results.NotFound();

        vendor.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
