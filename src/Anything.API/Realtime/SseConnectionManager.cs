using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Anything.API.Realtime;

public sealed class SseConnectionManager
{
    private readonly ConcurrentDictionary<string, (int HouseholdId, Channel<string> Channel)> _clients = new();

    public (string connectionId, ChannelReader<string> reader) AddClient(int householdId)
    {
        var id = Guid.NewGuid().ToString("N");
        var channel = Channel.CreateUnbounded<string>(
            new UnboundedChannelOptions { SingleReader = true });
        _clients[id] = (householdId, channel);
        return (id, channel.Reader);
    }

    public void RemoveClient(string connectionId)
    {
        if (_clients.TryRemove(connectionId, out var client))
            client.Channel.Writer.TryComplete();
    }

    /// <summary>Sends <paramref name="message"/> only to connections registered under <paramref name="householdId"/> — never a cross-household broadcast.</summary>
    public void Broadcast(int householdId, string message)
    {
        foreach (var (id, client) in _clients)
        {
            if (client.HouseholdId != householdId)
                continue;

            if (!client.Channel.Writer.TryWrite(message))
                _clients.TryRemove(id, out _);
        }
    }
}
