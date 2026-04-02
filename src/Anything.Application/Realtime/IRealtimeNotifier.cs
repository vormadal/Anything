namespace Anything.Application.Realtime;

public interface IRealtimeNotifier
{
    Task Notify(SyncEvent syncEvent, CancellationToken ct = default);
}
