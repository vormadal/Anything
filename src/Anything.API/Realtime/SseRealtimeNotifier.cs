using System.Text.Json;
using System.Text.Json.Serialization;
using Anything.Application.Realtime;

namespace Anything.API.Realtime;

public sealed class SseRealtimeNotifier(SseConnectionManager connectionManager) : IRealtimeNotifier
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public Task Notify(SyncEvent syncEvent, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(syncEvent, JsonOptions);
        connectionManager.Broadcast(json);
        return Task.CompletedTask;
    }
}
