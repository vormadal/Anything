using System.Threading.Channels;

namespace Anything.Application.Notifications;

public class PushDispatchQueue : IPushDispatchQueue
{
    /// <summary>
    /// Bounded so a push service outage can't grow the queue without limit.
    /// On overflow the oldest item is dropped: a backlog of stale nudges is
    /// worth less than the newest one, and the in-app notification is already
    /// safely stored either way.
    /// </summary>
    private const int Capacity = 1000;

    private readonly Channel<PushDispatch> _channel = Channel.CreateBounded<PushDispatch>(
        new BoundedChannelOptions(Capacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true
        });

    public bool TryEnqueue(PushDispatch dispatch) => _channel.Writer.TryWrite(dispatch);

    public IAsyncEnumerable<PushDispatch> ReadAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}
