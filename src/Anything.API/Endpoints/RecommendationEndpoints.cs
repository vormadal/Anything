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
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization();

        group.MapPost("/", async ([FromBody] CreateRecommendationRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateRecommendationCommand(request.Name, request.PreferredUnit));
        })
        .WithName("CreateRecommendation")
        .Produces<ShoppingListRecommendation>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/all", async ([FromQuery] int? categoryId, IMediator mediator) =>
        {
            return await mediator.Send(new GetAllRecommendationsQuery(categoryId));
        })
        .WithName("GetAllRecommendations")
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/uncategorized", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetUncategorizedRecommendationsQuery());
        })
        .WithName("GetUncategorizedRecommendations")
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/pending", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetPendingRecommendationsQuery());
        })
        .WithName("GetPendingRecommendations")
        .Produces<List<ShoppingListRecommendation>>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        group.MapPut("/{id}", async (int id, [FromBody] UpdateRecommendationRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateRecommendationCommand(id, request.Name, request.PreferredUnit, request.CategoryId));
        })
        .WithName("UpdateRecommendation")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/{id}/approve", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new ApproveRecommendationCommand(id));
        })
        .WithName("ApproveRecommendation")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .RequireAuthorization(UserRoles.Admin);

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteRecommendationCommand(id));
        })
        .WithName("DeleteRecommendation")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/export", async (IMediator mediator) =>
        {
            return await mediator.Send(new ExportRecommendationsQuery());
        })
        .WithName("ExportRecommendations")
        .Produces<ExportRecommendationsResponse>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/import", async ([FromBody] ImportRecommendationsRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ImportRecommendationsCommand(request.Recommendations));
        })
        .WithName("ImportRecommendations")
        .Produces(StatusCodes.Status204NoContent)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);
    }
}
