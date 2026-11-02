using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Anything.Contracts.Renovation;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Anything.Application.Features.Renovation.Commands;

public record SaveRenovationRoomTemplateCommand(string RoomType, SaveRenovationRoomTemplateRequest Request) : IRequest<IResult>;

/// <summary>
/// Creates or replaces this household's version of a room type. A built-in key customises that
/// default; any other valid key adds a household room type. Lines are replaced wholesale and take
/// their order from the request array.
/// </summary>
public class SaveRenovationRoomTemplateHandler(
    RenovationRepositories repos,
    IHouseholdContext householdContext,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<SaveRenovationRoomTemplateCommand, IResult>
{
    private const int MaxLines = 100;
    private static readonly Regex RoomTypePattern = new(@"\A[a-z0-9-]{1,50}\z", RegexOptions.CultureInvariant);

    public async Task<IResult> Handle(SaveRenovationRoomTemplateCommand command, CancellationToken ct = default)
    {
        var householdId = householdContext.HouseholdId;
        var roomType = command.RoomType;
        var request = command.Request;

        if (!RoomTypePattern.IsMatch(roomType))
            return Results.BadRequest("Room type must be 1–50 characters: lowercase letters, digits or hyphens.");
        if (ValidateLines(request.Lines) is { } error)
            return Results.BadRequest(error);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var row = await repos.RoomTemplates.Query()
            .FirstOrDefaultAsync(t => t.HouseholdId == householdId && t.RoomType == roomType && t.DeletedOn == null, ct);
        if (row is null)
        {
            row = new RenovationRoomTemplate { HouseholdId = householdId, RoomType = roomType, CreatedOn = now };
            repos.RoomTemplates.Add(row);
        }
        else
        {
            var previous = await repos.RoomTemplateLines.Query()
                .Where(l => l.TemplateId == row.Id)
                .ToListAsync(ct);
            foreach (var line in previous)
                repos.RoomTemplateLines.Remove(line);
            row.ModifiedOn = now;
        }

        row.Label = request.Label.Trim();
        row.Length = request.Length;
        row.Width = request.Width;
        row.Height = request.Height;
        row.Doors = request.Doors;
        row.Windows = request.Windows;
        await unitOfWork.SaveChanges(ct);

        var templateId = row.Id;
        repos.RoomTemplateLines.AddRange(request.Lines.Select((l, i) => ToLine(l, templateId, i)).ToList());
        await unitOfWork.SaveChanges(ct);

        var saved = RenovationTemplateResolver.Find(
            await RenovationTemplateResolver.Resolve(repos, householdId, ct), roomType);
        if (saved is null)
            return Results.NotFound();
        return Results.Ok(RenovationRoomTemplates.ToResponse(saved));
    }

    /// <summary>Returns an error message, or null when the lines are valid and their keys unique.</summary>
    private static string? ValidateLines(List<SaveRenovationTemplateLineRequest> lines)
    {
        if (lines.Count > MaxLines)
            return $"A room type can have at most {MaxLines} lines.";

        foreach (var line in lines)
        {
            var results = new List<ValidationResult>();
            if (!Validator.TryValidateObject(line, new ValidationContext(line), results, validateAllProperties: true))
                return results[0].ErrorMessage;
            if (RenovationValidation.ValidateBasis(line.Basis, line.FixedQuantity, out _) is { } basisError)
                return basisError;
        }

        var duplicate = lines.GroupBy(l => l.Key, StringComparer.Ordinal).FirstOrDefault(g => g.Count() > 1);
        return duplicate is null ? null : $"Line key '{duplicate.Key}' is used more than once.";
    }

    private static RenovationRoomTemplateLine ToLine(SaveRenovationTemplateLineRequest line, int templateId, int sortOrder)
    {
        var basis = Enum.Parse<RenovationQuantityBasis>(line.Basis, ignoreCase: true);
        return new RenovationRoomTemplateLine
        {
            TemplateId = templateId,
            Key = line.Key,
            Label = line.Label.Trim(),
            Group = line.Group.Trim(),
            MaterialName = line.MaterialName.Trim(),
            Category = line.Category.Trim(),
            Basis = basis,
            Unit = line.Unit.Trim(),
            DefaultPrice = line.DefaultPrice,
            WastePercent = line.WastePercent,
            FixedQuantity = basis == RenovationQuantityBasis.Fixed ? line.FixedQuantity : null,
            EnabledByDefault = line.EnabledByDefault,
            SortOrder = sortOrder
        };
    }
}
