using Anything.Application.Features.Recommendations.Commands;
using Anything.Application.Features.Recommendations.Queries;
using Anything.Contracts.Recommendations;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Mediator;
using Microsoft.AspNetCore.Mvc;

namespace Anything.API.Endpoints;

public static class RecommendationEndpoints
{
    public static void MapRecommendationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shopping-list-recommendations");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetApprovedRecommendationsQuery());
        })
        .WithName("GetApprovedRecommendations")
        .RequireAuthorization();

        group.MapPost("/", async ([FromBody] CreateRecommendationRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateRecommendationCommand(request.Name, request.PreferredUnit));
        })
        .WithName("CreateRecommendation")
        .Produces<ShoppingListRecommendation>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/all", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetAllRecommendationsQuery());
        })
        .WithName("GetAllRecommendations")
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/pending", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetPendingRecommendationsQuery());
        })
        .WithName("GetPendingRecommendations")
        .RequireAuthorization(UserRoles.Admin);

        group.MapPut("/{id}", async (int id, UpdateRecommendationRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecommendationCommand(id, request.Name, request.PreferredUnit));
        })
        .WithName("UpdateRecommendation")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/{id}/approve", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new ApproveRecommendationCommand(id));
        })
        .WithName("ApproveRecommendation")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization(UserRoles.Admin);

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecommendationCommand(id));
        })
        .WithName("DeleteRecommendation")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization(UserRoles.Admin);
    }
}
