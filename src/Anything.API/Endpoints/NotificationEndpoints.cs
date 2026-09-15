using System.Security.Claims;
using Anything.API.Authorization;
using Anything.Application.Features.Notifications.Commands;
using Anything.Application.Features.Notifications.Queries;
using Anything.Contracts.Notifications;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public class NotificationListQueryParameters
{
    public bool? UnreadOnly { get; set; }

    // Nullable for the same reason as NoteListQueryParameters.Limit: a
    // non-nullable value type bound via [AsParameters] has no reflection-visible
    // "optional" marker, so omitting ?limit= would 400 instead of defaulting.
    public int? Limit { get; set; }
}

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications");

        group.MapGet("/", async (
            [AsParameters] NotificationListQueryParameters parameters,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return Results.Ok(await mediator.Send(
                new GetNotificationsQuery(userId, parameters.UnreadOnly ?? false, parameters.Limit)));
        })
        .WithName("GetNotifications")
        .Produces<List<NotificationResponse>>()
        .RequireAuthorization();

        // Separate from the list so the header badge doesn't pull notification
        // bodies it never renders.
        group.MapGet("/unread-count", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return Results.Ok(await mediator.Send(new GetUnreadNotificationCountQuery(userId)));
        })
        .WithName("GetUnreadNotificationCount")
        .Produces<UnreadNotificationCountResponse>()
        .RequireAuthorization();

        group.MapPost("/", async (SendNotificationRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new SendHouseholdNotificationCommand(
                userId, request.Title, request.Body, request.IncludeSelf));
        })
        .WithName("SendHouseholdNotification")
        .Produces<SendNotificationResponse>()
        .WithParameterValidation()
        .RequireAuthorization()
        .RequireHouseholdManager();

        group.MapPut("/read-all", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new MarkAllNotificationsReadCommand(userId));
        })
        .WithName("MarkAllNotificationsRead")
        .Produces(204)
        .RequireAuthorization();

        group.MapPut("/{id}/read", async (int id, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new MarkNotificationReadCommand(userId, id));
        })
        .WithName("MarkNotificationRead")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new DeleteNotificationCommand(userId, id));
        })
        .WithName("DeleteNotification")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        MapPreferenceEndpoints(group);
    }

    private static void MapPreferenceEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/preferences", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return Results.Ok(await mediator.Send(new GetNotificationPreferencesQuery(userId)));
        })
        .WithName("GetNotificationPreferences")
        .Produces<List<NotificationPreferenceResponse>>()
        .RequireAuthorization();

        group.MapPut("/preferences", async (
            UpdateNotificationPreferencesRequest request,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new UpdateNotificationPreferencesCommand(userId, request.Preferences));
        })
        .WithName("UpdateNotificationPreferences")
        .Produces(204)
        .Produces(400)
        .WithParameterValidation()
        .RequireAuthorization();
    }

    private static bool TryGetUserId(ClaimsPrincipal user, out int userId) =>
        int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out userId);
}
