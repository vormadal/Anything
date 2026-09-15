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
    /// Queues <paramref name="dispatch"/>, returning false if the queue is full
    /// rather than blocking the caller. Never throws.
    /// </summary>
    bool TryEnqueue(PushDispatch dispatch);

    /// <summary>Consumed by the background sender; completes when the host stops.</summary>
    IAsyncEnumerable<PushDispatch> ReadAllAsync(CancellationToken ct);
}
