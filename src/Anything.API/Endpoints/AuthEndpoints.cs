using System.Security.Claims;
using Anything.Application.Features.Auth.Commands;
using Anything.Contracts.Auth;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", async (LoginRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new LoginCommand(request.Email, request.Password));
        })
        .WithName("Login")
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapPost("/refresh", async (RefreshTokenRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new RefreshTokenCommand(request.RefreshToken));
        })
        .WithName("RefreshToken")
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapPost("/register", async (RegisterRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new RegisterCommand(request.Email, request.Password, request.Name, request.InviteToken));
        })
        .WithName("Register")
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapGet("/invites", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
            return await mediator.Send(new GetInvitesQuery(userRole));
        })
        .WithName("GetInvites")
        .RequireAuthorization();

        group.MapPost("/invites", async (CreateInviteRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
            return await mediator.Send(new CreateInviteCommand(request.Email, userId, userRole));
        })
        .WithName("CreateInvite")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/invites/{id}", async (int id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
            return await mediator.Send(new DeleteInviteCommand(id, userRole));
        })
        .WithName("DeleteInvite")
        .RequireAuthorization();

        group.MapPut("/profile", async (UpdateProfileRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new UpdateProfileCommand(userId, request.Name));
        })
        .WithName("UpdateProfile")
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/profile/password", async (ChangePasswordRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword));
        })
        .WithName("ChangePassword")
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
