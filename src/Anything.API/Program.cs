using System.Text;
using Anything.API.Data;
using Anything.API.Endpoints;
using Anything.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.AddServiceDefaults();

// Add PostgreSQL with Entity Framework
builder.AddNpgsqlDbContext<ApplicationDbContext>("postgres");

// Add authentication services
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<ITokenService, TokenService>();

// Configure JWT authentication
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
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"] 
                ?? throw new InvalidOperationException("JWT SecretKey not configured")))
    };
});

builder.Services.AddAuthorization();

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
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Seed admin user
await SeedAdminUserAsync(app);

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

app.Run();

static async Task SeedAdminUserAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    await db.Database.EnsureCreatedAsync();

    var adminEmail = config["Admin:Email"] ?? "admin@anything.local";
    var adminExists = await db.Users.AnyAsync(u => u.Email == adminEmail);

    if (!adminExists)
    {
        var adminPassword = config["Admin:Password"] ?? "Admin123!";
        var admin = new User
        {
            Email = adminEmail,
            PasswordHash = passwordService.HashPassword(adminPassword),
            Name = "Administrator",
            Role = "Admin"
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}
