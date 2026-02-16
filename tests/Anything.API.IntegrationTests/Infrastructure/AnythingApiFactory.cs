using Anything.API.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Anything.API.IntegrationTests.Infrastructure;

public class AnythingApiFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString;

    public AnythingApiFactory(string connectionString)
    {
        _connectionString = connectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        
        // Set connection string using UseSetting - this is processed before Program.cs runs
        builder.UseSetting("ConnectionStrings:postgres", _connectionString);
        
        // Configure admin credentials for testing
        builder.UseSetting("Admin:Email", "admin@anything.local");
        builder.UseSetting("Admin:Password", "Admin123!");
        
        // Configure JWT settings for testing
        builder.UseSetting("Jwt:SecretKey", "test-secret-key-for-integration-tests-minimum-32-chars");
        builder.UseSetting("Jwt:Issuer", "Anything.API.Tests");
        builder.UseSetting("Jwt:Audience", "Anything.Frontend.Tests");
        builder.UseSetting("Jwt:AccessTokenExpirationMinutes", "15");
        
        builder.ConfigureServices(services =>
        {
            // Remove all Aspire/Npgsql DbContext registrations
            var descriptorsToRemove = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                    d.ServiceType == typeof(DbContextOptions) ||
                    d.ServiceType == typeof(ApplicationDbContext) ||
                    (d.ServiceType.IsGenericType && (
                        d.ServiceType.GetGenericTypeDefinition().FullName?.Contains("IDbContextPool") == true ||
                        d.ServiceType.GetGenericTypeDefinition().FullName?.Contains("IScopedDbContextLease") == true
                    )) ||
                    d.ServiceType.FullName?.Contains("Npgsql") == true)
                .ToList();

            foreach (var descriptor in descriptorsToRemove)
                services.Remove(descriptor);

            // Register DbContext with the Testcontainers PostgreSQL connection
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(_connectionString));
        });
    }

    public async Task EnsureDatabaseCreatedAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Somethings.RemoveRange(db.Somethings);
        db.RefreshTokens.RemoveRange(db.RefreshTokens);
        db.UserInvites.RemoveRange(db.UserInvites);
        // Don't remove users - the admin user is seeded and needed for auth
        await db.SaveChangesAsync();
    }
}
