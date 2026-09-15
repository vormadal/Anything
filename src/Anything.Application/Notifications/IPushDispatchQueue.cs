namespace Anything.Application.Notifications;

/// <summary>
/// Hands push work to the background sender. Exists so that dispatching a
/// notification never waits on a push service: a request that adds a household
/// member should not pay several seconds of third-party HTTP before it answers.
/// <para>
/// Delivery is best-effort by design — the queue is in-memory, so anything
/// still queued when the process stops is dropped. That is acceptable precisely
/// because the notification itself is already committed and visible in the app;
/// push is only the nudge.
/// </para>
/// </summary>
public interface IPushDispatchQueue
{
    /// <summary>
    /// Queues <paramref name="dispatch"/> without ever blocking the caller, and
    /// never throws.
    /// <para>
    /// A full queue does <em>not</em> make this return false — the oldest item
    /// is dropped to make room, because a backlog of stale nudges is worth less
    /// than the newest one. False means the queue is closed (the host is
    /// shutting down), which is why callers treat the result as informational
    /// rather than something to retry.
    /// </para>
    /// </summary>
    bool TryEnqueue(PushDispatch dispatch);

    /// <summary>Consumed by the background sender; completes when the host stops.</summary>
    IAsyncEnumerable<PushDispatch> ReadAllAsync(CancellationToken ct);
}
