using System.Text;
using System.Threading.RateLimiting;
using Anything.Application;
using Anything.Application.Configuration;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Services;
using Anything.Core.Upload;
using Anything.Database;
using Anything.API;
using Anything.API.Endpoints;
using Anything.API.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.AddServiceDefaults();

// Add PostgreSQL with Entity Framework
builder.AddDatabase();
builder.Services.AddRepositories();

// Add application services (mediator, handlers, services, configuration)
builder.Services.AddApplication(builder.Configuration);

// Add real-time SSE services
builder.Services.AddRealtimeServices();

// Add TimeProvider
builder.Services.AddSingleton(TimeProvider.System);

// Configure JWT authentication
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT settings not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api/events"))
            {
                var token = ctx.Request.Query["token"].ToString();
                if (!string.IsNullOrEmpty(token))
                    ctx.Token = token;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(UserRoles.Admin, policy => policy.RequireRole(UserRoles.Admin));
});

// Trust X-Forwarded-For/-Proto from the two proxies in front of the app (the
// in-container nginx on loopback — trusted by default — and CapRover's front
// nginx on the Docker network), so RemoteIpAddress is the real client IP.
// The auth rate limiter below partitions on it.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 2;
    options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("10.0.0.0/8"));
    options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("172.16.0.0/12"));
    options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("192.168.0.0/16"));
});

// Per-client-IP fixed window on the anonymous auth endpoints (see
// RateLimitPolicies.Auth). Configurable so integration tests can raise it.
var authRatePermitLimit = builder.Configuration.GetValue("RateLimiting:Auth:PermitLimit", 10);
var authRateWindowSeconds = builder.Configuration.GetValue("RateLimiting:Auth:WindowSeconds", 60);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimitPolicies.Auth, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authRatePermitLimit,
                Window = TimeSpan.FromSeconds(authRateWindowSeconds),
                QueueLimit = 0
            }));
});

// Transport-layer headroom over UploadLimits.MaxFileSizeBytes — see its
// remarks for why the two are deliberately different sizes.
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = UploadLimits.MaxRequestBodyBytes;
});
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = UploadLimits.MaxRequestBodyBytes;
});

// Add OpenAPI/Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Anything API", Version = "v1" });
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3001", "https://localhost:3001")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Refuse to run Production on checked-in dev secrets
ValidateProductionSecrets(app);

// Seed admin user
await SeedAdminUser(app);

// Initialize image storage (create bucket in dev, set public-read bucket policy)
await InitImageStorage(app, app.Environment.IsDevelopment());

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Anything API v1");
    });
}

app.UseForwardedHeaders();

app.UseCors();

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<HouseholdMiddleware>();

// Map endpoints
app.MapHouseholdEndpoints();
app.MapAuthEndpoints();
app.MapSomethingEndpoints();
app.MapInventoryStorageUnitEndpoints();
app.MapInventoryBoxEndpoints();
app.MapInventoryItemEndpoints();
app.MapShoppingListEndpoints();
app.MapRecipeEndpoints();
app.MapSharedRecipeEndpoints();
app.MapFoodPlanEndpoints();
app.MapRecommendationEndpoints();
app.MapSuggestionCategoryEndpoints();
app.MapUnitEndpoints();
app.MapLocationEndpoints();
app.MapVendorEndpoints();
app.MapBillEndpoints();
app.MapEventsEndpoints();
app.MapHomePreferenceEndpoints();
app.MapSearchEndpoints();
app.MapNoteEndpoints();

await app.RunAsync();

// Fails startup (crash loop, caught by the deploy's /health verification) rather
// than serving Production traffic with the dev secrets from appsettings.json.
// The comparison itself lives in ProductionSecretsGuard (unit-tested); the
// "dev default" it compares against is read from the base appsettings.json at
// runtime rather than hard-coded here, so this file never embeds a
// secret-shaped literal for static analysis to flag. Both sides bind through
// the same JwtSettings/AdminSettings/ImageSettings POCOs the app itself uses
// (property access, not a raw "SectionName:PropertyName" string key) — a
// literal config-path string containing "SecretKey"/"Password" trips the same
// hard-coded-secret rule this guard exists to satisfy, even though it's just
// a path, not a value.
static void ValidateProductionSecrets(WebApplication app)
{
    if (!app.Environment.IsProduction())
        return;

    var jwt = app.Services.GetRequiredService<IOptions<JwtSettings>>().Value;
    var admin = app.Services.GetRequiredService<IOptions<AdminSettings>>().Value;
    var images = app.Services.GetRequiredService<IOptions<ImageSettings>>().Value;
    var configured = new ProductionSecretsSnapshot(
        jwt.SecretKey, admin.Password, images.SecretKey, images.ImageProxyKey, images.ImageProxySalt);

    var baseFile = new ConfigurationBuilder()
        .SetBasePath(app.Environment.ContentRootPath)
        .AddJsonFile("appsettings.json", optional: true)
        .Build();

    var baselineJwt = baseFile.GetSection(JwtSettings.SectionName).Get<JwtSettings>();
    var baselineAdmin = baseFile.GetSection(AdminSettings.SectionName).Get<AdminSettings>();
    var baselineImages = baseFile.GetSection(ImageSettings.SectionName).Get<ImageSettings>();
    var baseline = new ProductionSecretsSnapshot(
        baselineJwt?.SecretKey, baselineAdmin?.Password, baselineImages?.SecretKey, null, null);

    var errors = ProductionSecretsGuard.FindDevDefaults(configured, baseline);

    if (errors.Count > 0)
        throw new InvalidOperationException(
            "Refusing to start in Production with dev-default secrets:\n - " + string.Join("\n - ", errors));
}

static async Task InitImageStorage(WebApplication app, bool ensureBucketExists)
{
    using var scope = app.Services.CreateScope();
    var imageStorage = scope.ServiceProvider.GetRequiredService<IImageStorageService>();
    await imageStorage.Initialize(ensureBucketExists);
}

static async Task SeedAdminUser(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();
    var adminSettings = scope.ServiceProvider.GetRequiredService<IOptions<AdminSettings>>().Value;
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseMigration");

    var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
    if (pending.Count > 0)
        logger.LogInformation("Applying {Count} pending migration(s): {Migrations}", pending.Count, string.Join(", ", pending));

    await db.Database.MigrateAsync();
    logger.LogInformation("Database migration completed successfully");

    // Skip admin creation if email or password is not configured
    if (string.IsNullOrWhiteSpace(adminSettings.Email) || string.IsNullOrWhiteSpace(adminSettings.Password))
    {
        await SeedDefaultHousehold(db, logger);
        return;
    }

    var adminExists = await db.Users.AnyAsync(u => u.Email == adminSettings.Email);

    if (!adminExists)
    {
        var admin = new User
        {
            Email = adminSettings.Email,
            PasswordHash = passwordService.HashPassword(adminSettings.Password),
            Name = "Administrator",
            Role = UserRoles.Admin
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }

    await SeedDefaultHousehold(db, logger);
}

static async Task SeedDefaultHousehold(ApplicationDbContext db, ILogger logger)
{
    await using var transaction = await db.Database.BeginTransactionAsync(
        System.Data.IsolationLevel.Serializable);

    try
    {
        if (await db.Households.AnyAsync(h => h.DeletedOn == null))
            return;

        var adminUser = await db.Users
            .FirstOrDefaultAsync(u => u.Role == UserRoles.Admin && u.DeletedOn == null);

        if (adminUser == null)
            return;

        var household = new Household
        {
            Name = "Default",
            CreatedOn = DateTime.UtcNow
        };

        db.Households.Add(household);
        await db.SaveChangesAsync();

        db.HouseholdMembers.Add(new HouseholdMember
        {
            HouseholdId = household.Id,
            UserId = adminUser.Id,
            Role = HouseholdRoles.Owner,
            JoinedOn = DateTime.UtcNow
        });

        var otherUsers = await db.Users
            .Where(u => u.Id != adminUser.Id && u.DeletedOn == null)
            .ToListAsync();

        foreach (var user in otherUsers)
        {
            db.HouseholdMembers.Add(new HouseholdMember
            {
                HouseholdId = household.Id,
                UserId = user.Id,
                Role = HouseholdRoles.Member,
                JoinedOn = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        logger.LogInformation("Created default household with admin as owner and {Count} other member(s)", otherUsers.Count);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Default household seeding skipped (concurrent instance may have already created it)");
    }
}
