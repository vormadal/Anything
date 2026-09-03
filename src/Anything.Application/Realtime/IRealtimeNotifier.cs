namespace Anything.Application.Realtime;

public interface IRealtimeNotifier
{
    /// <summary>
    /// Pushes <paramref name="syncEvent"/> to every SSE connection subscribed
    /// to <paramref name="householdId"/> only — never a cross-household
    /// broadcast. Pass <c>householdContext.HouseholdId</c> from the calling
    /// handler.
    /// </summary>
    Task Notify(SyncEvent syncEvent, int householdId, CancellationToken ct = default);
}
