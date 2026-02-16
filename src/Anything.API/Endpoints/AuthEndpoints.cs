using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Anything.API.Data;
using Anything.API.Services;
using Microsoft.EntityFrameworkCore;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", async (
            LoginRequest request,
            ApplicationDbContext db,
            IPasswordService passwordService,
            ITokenService tokenService) =>
        {
            var user = await db.Users
                .Where(u => u.Email == request.Email && u.DeletedOn == null)
                .FirstOrDefaultAsync();

            if (user == null || !passwordService.VerifyPassword(request.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            var accessToken = tokenService.GenerateAccessToken(user);
            var refreshToken = tokenService.GenerateRefreshToken();

            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            db.RefreshTokens.Add(refreshTokenEntity);
            await db.SaveChangesAsync();

            return Results.Ok(new LoginResponse(
                accessToken,
                refreshToken,
                user.Email,
                user.Name,
                user.Role
            ));
        })
        .WithName("Login")
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapPost("/refresh", async (
            RefreshTokenRequest request,
            ApplicationDbContext db,
            ITokenService tokenService) =>
        {
            var refreshToken = await db.RefreshTokens
                .Where(rt => rt.Token == request.RefreshToken && !rt.IsRevoked)
                .FirstOrDefaultAsync();

            if (refreshToken == null || refreshToken.ExpiresAt < DateTime.UtcNow)
            {
                return Results.Unauthorized();
            }

            var user = await db.Users.FindAsync(refreshToken.UserId);
            if (user == null || user.DeletedOn != null)
            {
                return Results.Unauthorized();
            }

            var newAccessToken = tokenService.GenerateAccessToken(user);
            var newRefreshToken = tokenService.GenerateRefreshToken();

            refreshToken.IsRevoked = true;
            var newRefreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            db.RefreshTokens.Add(newRefreshTokenEntity);
            await db.SaveChangesAsync();

            return Results.Ok(new RefreshTokenResponse(newAccessToken, newRefreshToken));
        })
        .WithName("RefreshToken")
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapPost("/register", async (
            RegisterRequest request,
            ApplicationDbContext db,
            IPasswordService passwordService) =>
        {
            var invite = await db.UserInvites
                .Where(i => i.Token == request.InviteToken && !i.IsUsed)
                .FirstOrDefaultAsync();

            if (invite == null || invite.ExpiresAt < DateTime.UtcNow || invite.Email != request.Email)
            {
                return Results.BadRequest("Invalid or expired invite token.");
            }

            var existingUser = await db.Users
                .Where(u => u.Email == request.Email)
                .AnyAsync();

            if (existingUser)
            {
                return Results.BadRequest("User already exists.");
            }

            var user = new User
            {
                Email = request.Email,
                PasswordHash = passwordService.HashPassword(request.Password),
                Name = request.Name,
                Role = "User"
            };

            invite.IsUsed = true;
            db.Users.Add(user);
            await db.SaveChangesAsync();

            return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Email, user.Name });
        })
        .WithName("Register")
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapPost("/invites", async (
            CreateInviteRequest request,
            ApplicationDbContext db,
            ClaimsPrincipal user) =>
        {
            var userId = int.Parse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value;

            if (userRole != "Admin")
            {
                return Results.Forbid();
            }

            var existingUser = await db.Users
                .Where(u => u.Email == request.Email)
                .AnyAsync();

            if (existingUser)
            {
                return Results.BadRequest("User with this email already exists.");
            }

            var token = Guid.NewGuid().ToString();
            var invite = new UserInvite
            {
                Email = request.Email,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedByUserId = userId
            };

            db.UserInvites.Add(invite);
            await db.SaveChangesAsync();

            return Results.Ok(new CreateInviteResponse($"/register?token={token}", token));
        })
        .WithName("CreateInvite")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/profile", async (
            UpdateProfileRequest request,
            ApplicationDbContext db,
            ClaimsPrincipal user) =>
        {
            var userId = int.Parse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            var userEntity = await db.Users.FindAsync(userId);
            if (userEntity == null || userEntity.DeletedOn != null)
            {
                return Results.NotFound();
            }

            userEntity.Name = request.Name;
            userEntity.ModifiedOn = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("UpdateProfile")
        .WithParameterValidation()
        .RequireAuthorization();
    }
}

public record LoginRequest(
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    string Email,
    [Required(ErrorMessage = "Password is required.")]
    string Password);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    string Email,
    string Name,
    string Role);

public record RefreshTokenRequest(
    [Required(ErrorMessage = "Token is required.")]
    string RefreshToken);

public record RefreshTokenResponse(
    string AccessToken,
    string RefreshToken);

public record RegisterRequest(
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    string Email,
    [Required(ErrorMessage = "Password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 100 characters.")]
    string Password,
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name,
    [Required(ErrorMessage = "Token is required.")]
    string InviteToken);

public record CreateInviteRequest(
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    string Email);

public record CreateInviteResponse(
    string InviteUrl,
    string Token);

public record UpdateProfileRequest(
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters.")]
    string Name);

