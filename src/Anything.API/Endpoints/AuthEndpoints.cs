using System.Security.Claims;
using Anything.Application.Features.Auth.Commands;
using Anything.Contracts.Auth;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;
using Microsoft.AspNetCore.Http;

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
        .Produces<LoginResponse>()
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapPost("/refresh", async (RefreshTokenRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new RefreshTokenCommand(request.RefreshToken));
        })
        .WithName("RefreshToken")
        .Produces<RefreshTokenResponse>()
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapPost("/register", async (RegisterRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new RegisterCommand(request.Email, request.Password, request.Name, request.InviteToken));
        })
        .WithName("Register")
        .Produces(201)
        .Produces(400)
        .WithParameterValidation()
        .AllowAnonymous();

        group.MapGet("/invites/me", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new GetMyPendingInvitesQuery(userId));
        })
        .WithName("GetMyPendingInvites")
        .Produces<List<PendingInviteResponse>>()
        .RequireAuthorization();

        group.MapPost("/invites/{token}/accept", async (string token, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new AcceptHouseholdInviteCommand(token, userId));
        })
        .WithName("AcceptHouseholdInvite")
        .Produces(200)
        .Produces<HttpValidationProblemDetails>(400)
        .Produces(403)
        .Produces(404)
        .RequireAuthorization();

        group.MapGet("/invites", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
            return await mediator.Send(new GetInvitesQuery(userRole));
        })
        .WithName("GetInvites")
        .Produces<List<InviteResponse>>()
        .RequireAuthorization();

        group.MapPost("/invites", async (CreateInviteRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
            return await mediator.Send(new CreateInviteCommand(request.Email, userId, userRole, request.HouseholdId));
        })
        .WithName("CreateInvite")
        .Produces<CreateInviteResponse>()
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/invites/{id}", async (int id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
            return await mediator.Send(new DeleteInviteCommand(id, userRole));
        })
        .WithName("DeleteInvite")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        group.MapPut("/profile", async (UpdateProfileRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new UpdateProfileCommand(userId, request.Name));
        })
        .WithName("UpdateProfile")
        .Produces(204)
        .Produces(401)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/profile/password", async (ChangePasswordRequest request, ClaimsPrincipal user, IMediator mediator) =>
        {
            if (!int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Results.Unauthorized();
            return await mediator.Send(new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword));
        })
        .WithName("ChangePassword")
        .Produces(204)
        .Produces(400)
        .Produces(401)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();
    }
}
