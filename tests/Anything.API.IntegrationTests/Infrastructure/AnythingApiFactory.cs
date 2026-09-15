using System.Security.Cryptography;
using Anything.Application.Notifications;
using Anything.Core.Entities;
using Anything.Core.Services;
using Anything.Database;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
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

        // Raise the auth rate limit far above what the suite can hit: every test
        // logs in at least once against this shared TestServer, and all requests
        // share one partition (TestServer has no RemoteIpAddress).
        builder.UseSetting("RateLimiting:Auth:PermitLimit", "100000");

        // Enable Web Push with a pair generated for this process. Generated,
        // not checked in: a literal private key in the repo is exactly what
        // secret scanning is meant to catch, and the tests only need the
        // feature to read as configured. Nothing ever leaves the process —
        // IPushSender is stubbed below.
        builder.UseSetting("Push:PublicKey", TestVapidKeys.PublicKey);
        builder.UseSetting("Push:PrivateKey", TestVapidKeys.PrivateKey);
        builder.UseSetting("Push:Subject", "mailto:tests@anything.local");

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

            // Replace the real Minio-backed storage with a no-op stub so tests
            // don't require a running Minio instance.
            var imageStorageDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IImageStorageService));
            if (imageStorageDescriptor != null)
                services.Remove(imageStorageDescriptor);
            services.AddScoped<IImageStorageService, NoOpImageStorageService>();

            // Replace the real Web Push sender so a registered test device can
            // never cause an outbound request to a push service. The background
            // PushSenderHostedService still runs and still drains the queue —
            // only the delivery is a no-op.
            var pushSenderDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IPushSender));
            if (pushSenderDescriptor != null)
                services.Remove(pushSenderDescriptor);
            services.AddScoped<IPushSender, NoOpPushSender>();
        });
    }

    public async Task EnsureDatabaseCreatedAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    private const string AdminEmail = "admin@anything.local";

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Truncate all tables except Users in one shot — CASCADE handles FK ordering automatically.
        // This way no new lines are needed when new entities are added.
        var tableNames = db.Model.GetEntityTypes()
            .Where(t => t.ClrType != typeof(User))
            .Select(t => $"\"{t.GetTableName()}\"")
            .Distinct()
            .ToList();

        await db.Database.ExecuteSqlRawAsync(
            $"TRUNCATE {string.Join(", ", tableNames)} RESTART IDENTITY CASCADE");

        // Remove all non-admin users to avoid conflicts between tests
        db.Users.RemoveRange(db.Users.Where(u => u.Email != AdminEmail));
        await db.SaveChangesAsync();
    }
}

/// <summary>
/// A real P-256 pair, generated once per test run. See the note in
/// <see cref="AnythingApiFactory.ConfigureWebHost"/> for why it isn't a literal.
/// </summary>
internal static class TestVapidKeys
{
    static TestVapidKeys()
    {
        using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var parameters = ecdsa.ExportParameters(includePrivateParameters: true);

        // Uncompressed point (0x04 || X || Y), the encoding VAPID expects.
        var publicKey = new byte[65];
        publicKey[0] = 0x04;
        parameters.Q.X!.CopyTo(publicKey, 1);
        parameters.Q.Y!.CopyTo(publicKey, 33);

        PublicKey = Base64Url(publicKey);
        PrivateKey = Base64Url(parameters.D!);
    }

    public static string PublicKey { get; }
    public static string PrivateKey { get; }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

file class NoOpPushSender : IPushSender
{
    public Task Send(PushDispatch dispatch, CancellationToken ct = default) => Task.CompletedTask;
}

file class NoOpImageStorageService : IImageStorageService
{
    public Task Initialize(bool ensureBucketExists = false, CancellationToken ct = default) => Task.CompletedTask;
    public Task<string> Upload(Stream stream, string fileName, string contentType, long contentLength, CancellationToken ct = default, string folder = "files") => Task.FromResult(fileName);
    public string GetImageUrl(string storageKey, int width, int height, string resizingType = "fill") => storageKey;
    public Task<Stream> GetFileStream(string storageKey, CancellationToken ct = default) => Task.FromResult<Stream>(Stream.Null);
    public Task Delete(string storageKey, CancellationToken ct = default) => Task.CompletedTask;
}
