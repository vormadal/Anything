using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Anything.API.Realtime;

public sealed class SseConnectionManager
{
    private readonly ConcurrentDictionary<string, Channel<string>> _clients = new();

    public (string connectionId, ChannelReader<string> reader) AddClient()
    {
        var id = Guid.NewGuid().ToString("N");
        var channel = Channel.CreateUnbounded<string>(
            new UnboundedChannelOptions { SingleReader = true });
        _clients[id] = channel;
        return (id, channel.Reader);
    }

    public void RemoveClient(string connectionId)
    {
        if (_clients.TryRemove(connectionId, out var channel))
            channel.Writer.TryComplete();
    }

    public void Broadcast(string message)
    {
        foreach (var (id, channel) in _clients)
        {
            if (!channel.Writer.TryWrite(message))
                _clients.TryRemove(id, out _);
        }
    }
}
