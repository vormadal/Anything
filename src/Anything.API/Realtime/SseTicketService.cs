using System.Collections.Concurrent;
using Anything.Application.Common;

namespace Anything.API.Realtime;

/// <summary>
/// Issues and redeems short-lived, single-use tickets so <c>GET /api/events</c>
/// (an <c>EventSource</c> connection, which can't set request headers) never
/// carries the real JWT access token — or the household id — in its query
/// string; the token would land the live credential in nginx/proxy access
/// logs. A client instead calls <c>POST /api/events/ticket</c> (a normal,
/// header-authenticated request, carrying the usual <c>X-Household-Id</c>) to
/// mint a ticket, then opens the SSE connection with <c>?ticket=...</c>. The
/// ticket carries both the user id and the household id its membership was
/// checked against, so the connection is registered under that one household
/// and never sees another household's events — see <see cref="SseConnectionManager"/>.
/// </summary>
/// <remarks>
/// In-memory and per-instance, matching <see cref="SseConnectionManager"/> —
/// this app runs as a single API instance, so a distributed store would be
/// unjustified complexity. A ticket is consumed (removed) the moment it's
/// looked up, valid or not, so it can never be redeemed twice.
/// </remarks>
public sealed class SseTicketService(TimeProvider timeProvider)
{
    private static readonly TimeSpan TicketLifetime = TimeSpan.FromSeconds(30);

    private readonly ConcurrentDictionary<string, Ticket> _tickets = new();

    public string IssueTicket(int userId, int householdId)
    {
        PruneExpired();

        var value = SecureTokenGenerator.GenerateHexToken();
        _tickets[value] = new Ticket(userId, householdId, timeProvider.GetUtcNow().UtcDateTime.Add(TicketLifetime));
        return value;
    }

    /// <summary>Redeems (and removes) a ticket. Returns the associated user/household ids, or null if missing/expired.</summary>
    public (int UserId, int HouseholdId)? Redeem(string value)
    {
        if (!_tickets.TryRemove(value, out var ticket))
            return null;

        return ticket.ExpiresAt < timeProvider.GetUtcNow().UtcDateTime
            ? null
            : (ticket.UserId, ticket.HouseholdId);
    }

    private void PruneExpired()
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        foreach (var (value, ticket) in _tickets)
        {
            if (ticket.ExpiresAt < now)
                _tickets.TryRemove(value, out _);
        }
    }

    private readonly record struct Ticket(int UserId, int HouseholdId, DateTime ExpiresAt);
}
