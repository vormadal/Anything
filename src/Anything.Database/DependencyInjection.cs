using Anything.Core.Repositories;
using Anything.Core.Services;
using Anything.Database.Interceptors;
using Anything.Database.Repositories;
using Anything.Database.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Anything.Database;

public static class DependencyInjection
{
    public static IHostApplicationBuilder AddDatabase(this IHostApplicationBuilder builder)
    {
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("anything"))
                .AddInterceptors(new SearchIndexInterceptor()));

        return builder;
    }

    public static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<ISearchIndexService, SearchIndexService>();
        return services;
    }
}
