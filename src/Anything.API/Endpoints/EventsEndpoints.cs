using System.Security.Claims;
using Anything.API.Authorization;
using Anything.API.Realtime;
using Anything.Contracts.Realtime;
using Anything.Core.Entities;
using Anything.Core.Repositories;

namespace Anything.API.Endpoints;

public static class EventsEndpoints
{
    private const string HouseholdIdHeader = "X-Household-Id";
    private const string MissingOrInvalidHouseholdHeader = "Missing or invalid X-Household-Id header.";
    private const string NotAHouseholdMember = "You are not a member of this household.";
    private const string InvalidOrExpiredTicket = "Invalid or expired ticket.";

    public static void MapEventsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/events");

        // Header-authenticated (normal Authorization: Bearer + X-Household-Id,
        // like every other household-scoped endpoint) — mints a short-lived,
        // single-use ticket the SSE connection below redeems. This endpoint is
        // exempt from HouseholdMiddleware (see its ExemptPrefixes) alongside
        // the streaming endpoint, so it checks membership itself via the same
        // helper the middleware uses. See SseTicketService for why a ticket
        // exists instead of a token/household query param.
        group.MapPost("/ticket", async (
            HttpContext context,
            ClaimsPrincipal user,
            SseTicketService ticketService,
            IRepository<HouseholdMember> memberRepository,
            IRepository<Household> householdRepository) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();

            if (!context.Request.Headers.TryGetValue(HouseholdIdHeader, out var headerValue)
                || !int.TryParse(headerValue, out var householdId))
                return Results.BadRequest(MissingOrInvalidHouseholdHeader);

            var member = await HouseholdMembershipLookup.FindMembership(
                memberRepository, householdRepository, householdId, userId, context.RequestAborted);
            if (member is null)
                return Results.Json(new { error = NotAHouseholdMember }, statusCode: StatusCodes.Status403Forbidden);

            return Results.Ok(new EventsTicketResponse(ticketService.IssueTicket(userId, householdId)));
        })
        .WithName("CreateEventsTicket")
        .Produces<EventsTicketResponse>()
        .Produces(StatusCodes.Status403Forbidden)
        .RequireAuthorization();

        // EventSource can't set headers, so this is intentionally AllowAnonymous
        // at the ASP.NET auth layer — the ticket in the query string is the
        // actual credential, checked by hand below, and it's also what decides
        // which household's events this connection receives.
        group.MapGet("/", async (string? ticket, HttpContext context, SseConnectionManager connectionManager, SseTicketService ticketService) =>
        {
            var redeemed = string.IsNullOrEmpty(ticket) ? null : ticketService.Redeem(ticket);
            if (redeemed is not { } session)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = InvalidOrExpiredTicket }, context.RequestAborted);
                return;
            }

            var ct = context.RequestAborted;

            context.Response.Headers.Append("Content-Type", "text/event-stream");
            context.Response.Headers.Append("Cache-Control", "no-cache");
            context.Response.Headers.Append("X-Accel-Buffering", "no");
            context.Response.Headers.Append("Connection", "keep-alive");

            await context.Response.Body.FlushAsync(ct);

            var (connectionId, reader) = connectionManager.AddClient(session.HouseholdId);
            try
            {
                await context.Response.WriteAsync(": connected\n\n", ct);
                await context.Response.Body.FlushAsync(ct);

                await foreach (var message in reader.ReadAllAsync(ct))
                {
                    await context.Response.WriteAsync($"data: {message}\n\n", ct);
                    await context.Response.Body.FlushAsync(ct);
                }
            }
            catch (OperationCanceledException)
            {
                // Normal client disconnect
            }
            finally
            {
                connectionManager.RemoveClient(connectionId);
            }
        })
        .WithName("ServerSentEvents")
        .AllowAnonymous();
    }
}
