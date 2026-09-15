using Anything.Application.Notifications;

namespace Anything.API.Notifications;

/// <summary>
/// Drains <see cref="IPushDispatchQueue"/> and sends each item. Lives in the
/// API because this is the host; the sending itself is application logic
/// (<see cref="IPushSender"/>), which is scoped and so gets a fresh scope per
/// item rather than holding a repository for the lifetime of the process.
/// </summary>
public class PushSenderHostedService(
    IPushDispatchQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<PushSenderHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var dispatch in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var sender = scope.ServiceProvider.GetRequiredService<IPushSender>();
                await sender.Send(dispatch, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Host shutting down — anything still queued is dropped, which
                // is the documented trade-off for an in-memory queue.
                break;
            }
            catch (Exception ex)
            {
                // Never let one bad dispatch kill the loop: the service would
                // stop silently and push would go dead until the next restart.
                logger.LogError(ex, "Push dispatch failed");
            }
        }
    }
}
