using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.Vendors.Commands;

public record CreateVendorCommand(string Name, string? Website) : IRequest<Vendor>;

public class CreateVendorHandler(
    IRepository<Vendor> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<CreateVendorCommand, Vendor>
{
    public async Task<Vendor> Handle(CreateVendorCommand command, CancellationToken ct = default)
    {
        var vendor = new Vendor
        {
            Name = command.Name,
            Website = command.Website,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };
        repository.Add(vendor);
        await unitOfWork.SaveChanges(ct);
        return vendor;
    }
}
