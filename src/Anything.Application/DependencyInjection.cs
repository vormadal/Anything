using Anything.Application.Configuration;
using Anything.Application.Services;
using Anything.Core.Services;
using Anything.Mediator;
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

        // Services
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IImageStorageService, MinioStorageService>();
        services.AddHttpClient<IRecipeParserService, RecipeParserService>(client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd("AnythingApp/1.0 (recipe-parser)");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

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

        return services;
    }
}
