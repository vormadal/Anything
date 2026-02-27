using System.Text;
using Anything.Application;
using Anything.Application.Configuration;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Core.Services;
using Anything.Database;
using Anything.API.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
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
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(UserRoles.Admin, policy => policy.RequireRole(UserRoles.Admin));
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

// Seed admin user
await SeedAdminUser(app);

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

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

// Map endpoints
app.MapAuthEndpoints();
app.MapSomethingEndpoints();
app.MapInventoryStorageUnitEndpoints();
app.MapInventoryBoxEndpoints();
app.MapInventoryItemEndpoints();
app.MapShoppingListEndpoints();
app.MapRecipeEndpoints();
app.MapRecommendationEndpoints();

await app.RunAsync();

static async Task SeedAdminUser(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();
    var adminSettings = scope.ServiceProvider.GetRequiredService<IOptions<AdminSettings>>().Value;
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseMigration");

    // Retry migration with exponential backoff to handle production environments
    // where the database may not be immediately available (e.g., Docker without Aspire's WaitFor)
    const int maxRetries = 5;
    for (var attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
            if (pending.Count > 0)
                logger.LogInformation("Applying {Count} pending migration(s): {Migrations}", pending.Count, string.Join(", ", pending));

            await db.Database.MigrateAsync();
            logger.LogInformation("Database migration completed successfully");
            break;
        }
        catch (Exception ex) when (attempt < maxRetries)
        {
            var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
            logger.LogWarning(ex, "Database migration attempt {Attempt}/{MaxRetries} failed. Retrying in {Delay}s...",
                attempt, maxRetries, delay.TotalSeconds);
            await Task.Delay(delay);
        }
    }

    // Skip admin creation if email or password is not configured
    if (string.IsNullOrWhiteSpace(adminSettings.Email) || string.IsNullOrWhiteSpace(adminSettings.Password))
    {
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
}
