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

public class SentNotificationQueryParameters
{
    // Nullable for the same reason as NotificationListQueryParameters.Limit.
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

        // The author's own view of what they sent, as opposed to "/" which reads
        // the caller's inbox. Not manager-gated even though only a manager can
        // send: it returns nothing but the caller's own history, and a demoted
        // manager should still be able to see what they sent while they were one.
        group.MapGet("/sent", async (
            [AsParameters] SentNotificationQueryParameters parameters,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return Results.Ok(await mediator.Send(
                new GetSentNotificationsQuery(userId, parameters.Limit)));
        })
        .WithName("GetSentNotifications")
        .Produces<List<SentNotificationResponse>>()
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
        MapPushEndpoints(group);
    }

    private static void MapPushEndpoints(RouteGroupBuilder group)
    {
        // Anonymous-shaped data (just the server's public key), but still
        // authorized: there's no reason to advertise a deployment's push
        // configuration to the world.
        group.MapGet("/push/config", async (IMediator mediator) =>
            Results.Ok(await mediator.Send(new GetPushConfigQuery())))
        .WithName("GetPushConfig")
        .Produces<PushConfigResponse>()
        .RequireAuthorization();

        group.MapPost("/push/devices", async (
            RegisterPushDeviceRequest request,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new RegisterPushDeviceCommand(
                userId, request.Endpoint, request.P256dhKey, request.AuthKey, request.UserAgent));
        })
        .WithName("RegisterPushDevice")
        .Produces(204)
        .Produces(503)
        .WithParameterValidation()
        .RequireAuthorization();

        // POST rather than DELETE: the browser identifies its subscription by
        // endpoint URL, not by an id, and a DELETE with a body is awkward for
        // both the spec and the generated client.
        group.MapPost("/push/devices/remove", async (
            RemovePushDeviceRequest request,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            return await mediator.Send(new RemovePushDeviceCommand(userId, request.Endpoint));
        })
        .WithName("RemovePushDevice")
        .Produces(204)
        .WithParameterValidation()
        .RequireAuthorization();
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
