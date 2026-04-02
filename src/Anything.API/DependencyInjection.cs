using Anything.Application.Realtime;
using Anything.API.Realtime;

namespace Anything.API;

public static class DependencyInjection
{
    public static IServiceCollection AddRealtimeServices(this IServiceCollection services)
    {
        services.AddSingleton<SseConnectionManager>();
        services.AddScoped<IRealtimeNotifier, SseRealtimeNotifier>();
        return services;
    }
}
