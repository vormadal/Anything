using Anything.API.Realtime;

namespace Anything.API.Endpoints;

public static class EventsEndpoints
{
    public static void MapEventsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/events", async (HttpContext context, SseConnectionManager connectionManager) =>
        {
            var ct = context.RequestAborted;

            context.Response.Headers.Append("Content-Type", "text/event-stream");
            context.Response.Headers.Append("Cache-Control", "no-cache");
            context.Response.Headers.Append("X-Accel-Buffering", "no");
            context.Response.Headers.Append("Connection", "keep-alive");

            await context.Response.Body.FlushAsync(ct);

            var (connectionId, reader) = connectionManager.AddClient();
            try
            {
                await context.Response.WriteAsync(": connected\n\n", ct);
                await context.Response.Body.FlushAsync(ct);

                await foreach (var message in reader.ReadAllAsync(ct))
                {
                    await context.Response.WriteAsync($"data: {message}\n\n", ct);
                    await context.Response.Body.FlushAsync(ct);
                }
            }
            catch (OperationCanceledException)
            {
                // Normal client disconnect
            }
            finally
            {
                connectionManager.RemoveClient(connectionId);
            }
        })
        .WithName("ServerSentEvents")
        .RequireAuthorization();
    }
}
