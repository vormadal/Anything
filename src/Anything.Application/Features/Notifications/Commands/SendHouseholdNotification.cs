using Anything.Application.Notifications;
using Anything.Contracts.Notifications;
using Anything.Core.Constants;
using Anything.Core.Services;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Notifications.Commands;

/// <summary>
/// A household manager's announcement to the household. Authorization is the
/// endpoint's <c>RequireHouseholdManager()</c>; the category is fixed here so a
/// send can never be routed around a recipient's opt-out for another category.
/// </summary>
public record SendHouseholdNotificationCommand(int SenderUserId, string Title, string? Body, bool IncludeSelf)
    : IRequest<IResult>;

public class SendHouseholdNotificationHandler(
    INotificationDispatcher dispatcher,
    IHouseholdContext householdContext) : IRequestHandler<SendHouseholdNotificationCommand, IResult>
{
    public async Task<IResult> Handle(SendHouseholdNotificationCommand command, CancellationToken ct = default)
    {
        var recipients = await dispatcher.Dispatch(new NotificationDispatch
        {
            HouseholdId = householdContext.HouseholdId,
            Category = NotificationCategories.Announcement,
            Title = command.Title,
            Body = command.Body,
            CreatedByUserId = command.SenderUserId,
            // Announcements are one-offs: no SourceKey, so sending the same text
            // twice deliberately produces two notifications.
            ExcludeUserId = command.IncludeSelf ? null : command.SenderUserId
        }, ct);

        return Results.Ok(new SendNotificationResponse(recipients));
    }
}
