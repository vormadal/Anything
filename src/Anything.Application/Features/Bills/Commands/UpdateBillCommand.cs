using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Bills.Commands;

public record UpdateBillCommand(
    int Id,
    string Name,
    int? VendorId,
    string Frequency,
    bool IsAutomated,
    int? LocationId,
    string? ManagementUrl,
    string? Category,
    string? Notes) : IRequest<IResult>;

public class UpdateBillHandler(
    IRepository<Bill> repository,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider)
    : IRequestHandler<UpdateBillCommand, IResult>
{
    public async Task<IResult> Handle(UpdateBillCommand command, CancellationToken ct = default)
    {
        if (!BillHelpers.TryParseFrequency(command.Frequency, out var frequency))
            return Results.BadRequest($"Invalid frequency '{command.Frequency}'.");

        var bill = await repository.Query()
            .Where(b => b.Id == command.Id && b.DeletedOn == null && b.HouseholdId == householdContext.HouseholdId)
            .FirstOrDefaultAsync(ct);
        if (bill is null)
            return Results.NotFound();

        bill.Name = command.Name;
        bill.VendorId = command.VendorId;
        bill.Frequency = frequency;
        bill.IsAutomated = command.IsAutomated;
        bill.LocationId = command.LocationId;
        bill.ManagementUrl = command.ManagementUrl;
        bill.Category = command.Category;
        bill.Notes = command.Notes;
        bill.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;

        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
