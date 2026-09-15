using Anything.Application.Common;
using Anything.Application.Configuration;
using Anything.Application.Notifications;
using Anything.Application.Services;
using Anything.Core.Services;
using Anything.Mediator;
using Lib.Net.Http.WebPush;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Anything.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        // Mediator
        services.AddScoped<IMediator, Mediator.Mediator>();

        // Handlers via Scrutor (scan this assembly)
        var assembly = typeof(DependencyInjection).Assembly;
        services.Scan(scan => scan
            .FromAssemblies(assembly)
            .AddClasses(c => c.AssignableTo(typeof(IRequestHandler<,>)))
            .AsImplementedInterfaces()
            .WithScopedLifetime());
        services.Scan(scan => scan
            .FromAssemblies(assembly)
            .AddClasses(c => c.AssignableTo(typeof(IRequestHandler<>)))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        // Household context
        services.AddScoped<HouseholdContext>();
        services.AddScoped<IHouseholdContext>(sp => sp.GetRequiredService<HouseholdContext>());

        // Services
        services.AddScoped<IUnitCatalog, UnitCatalog>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IImageStorageService, MinioStorageService>();
        services.AddScoped<IRecipeImageService, RecipeImageService>();
        services.AddScoped<INotificationDispatcher, NotificationDispatcher>();

        // Web Push. Registered unconditionally so the graph is identical
        // whether or not keys are present — VapidCredentials reports itself
        // unconfigured and every caller short-circuits on that, rather than
        // the container shape depending on configuration.
        services.AddSingleton<VapidCredentials>();
        services.AddSingleton<IPushDispatchQueue, PushDispatchQueue>();
        services.AddScoped<IPushSender, WebPushSender>();
        services.AddHttpClient<PushServiceClient>();
        services.AddSingleton<IOutboundAddressResolver, DnsOutboundAddressResolver>();
        services.AddHttpClient<IRecipeParserService, RecipeParserService>(client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd("AnythingApp/1.0 (recipe-parser)");
            client.Timeout = TimeSpan.FromSeconds(30);
        })
        // Auto-redirect must stay off: RecipeParserService's SSRF guard
        // validates every redirect hop itself (see FetchHtml).
        .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler { AllowAutoRedirect = false });

        // Configuration
        services.AddOptions<ImageSettings>()
            .Bind(configuration.GetSection(ImageSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<JwtSettings>()
            .Bind(configuration.GetSection(JwtSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<AdminSettings>()
            .Bind(configuration.GetSection(AdminSettings.SectionName));

        // No ValidateDataAnnotations/ValidateOnStart: push is opt-in, and an
        // absent section must leave the app starting exactly as before.
        services.AddOptions<PushSettings>()
            .Bind(configuration.GetSection(PushSettings.SectionName));

        return services;
    }
}
