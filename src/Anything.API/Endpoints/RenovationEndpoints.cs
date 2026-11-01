using Anything.Application.Features.Renovation.Commands;
using Anything.Application.Features.Renovation.Queries;
using Anything.Contracts.Renovation;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public static class RenovationEndpoints
{
    public static void MapRenovationEndpoints(this IEndpointRouteBuilder app)
    {
        MapProjects(app.MapGroup("/api/renovation-projects"));
        MapMaterials(app.MapGroup("/api/renovation-materials"));

        app.MapGet("/api/renovation-room-templates", async (IMediator mediator) =>
            await mediator.Send(new GetRenovationRoomTemplatesQuery()))
        .WithName("GetRenovationRoomTemplates")
        .RequireAuthorization();
    }

    private static void MapProjects(RouteGroupBuilder group)
    {
        group.MapGet("/", async (IMediator mediator) =>
            await mediator.Send(new GetRenovationProjectsQuery()))
        .WithName("GetRenovationProjects")
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new GetRenovationProjectByIdQuery(id)))
        .WithName("GetRenovationProjectById")
        .Produces<RenovationProjectResponse>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateRenovationProjectRequest request, IMediator mediator) =>
            await mediator.Send(new CreateRenovationProjectCommand(request.Name, request.Budget, request.Notes)))
        .WithName("CreateRenovationProject")
        .Produces<RenovationProjectResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateRenovationProjectRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateRenovationProjectCommand(id, request.Name, request.Budget, request.Notes)))
        .WithName("UpdateRenovationProject")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new DeleteRenovationProjectCommand(id)))
        .WithName("DeleteRenovationProject")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();

        // Rooms
        group.MapPost("/{id}/rooms", async (int id, CreateRenovationRoomRequest request, IMediator mediator) =>
            await mediator.Send(new CreateRenovationRoomCommand(id, request)))
        .WithName("CreateRenovationRoom")
        .Produces<RenovationRoomResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/rooms/{roomId}", async (int id, int roomId, UpdateRenovationRoomRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateRenovationRoomCommand(id, roomId, request)))
        .WithName("UpdateRenovationRoom")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/rooms/{roomId}", async (int id, int roomId, IMediator mediator) =>
            await mediator.Send(new DeleteRenovationRoomCommand(id, roomId)))
        .WithName("DeleteRenovationRoom")
        .Produces(204)
        .Produces(404)
        .Produces(409)
        .RequireAuthorization();

        // Lines
        group.MapPost("/{id}/rooms/{roomId}/lines", async (int id, int roomId, SaveRenovationLineRequest request, IMediator mediator) =>
            await mediator.Send(new CreateRenovationLineCommand(id, roomId, request)))
        .WithName("CreateRenovationLine")
        .Produces<RenovationLineResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}/lines/{lineId}", async (int id, int lineId, SaveRenovationLineRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateRenovationLineCommand(id, lineId, request)))
        .WithName("UpdateRenovationLine")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/lines/{lineId}", async (int id, int lineId, IMediator mediator) =>
            await mediator.Send(new DeleteRenovationLineCommand(id, lineId)))
        .WithName("DeleteRenovationLine")
        .Produces(204)
        .Produces(404)
        .Produces(409)
        .RequireAuthorization();

        group.MapPost("/{id}/lines/replace-material", async (int id, ReplaceRenovationMaterialRequest request, IMediator mediator) =>
            await mediator.Send(new ReplaceRenovationMaterialCommand(id, request.FromMaterialId, request.ToMaterialId)))
        .WithName("ReplaceRenovationMaterial")
        .Produces<ReplaceRenovationMaterialResponse>()
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        // Purchases
        group.MapGet("/{id}/purchases", async (int id, IMediator mediator) =>
            await mediator.Send(new GetRenovationPurchasesQuery(id)))
        .WithName("GetRenovationPurchases")
        .Produces<RenovationPurchaseResponse[]>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/{id}/purchases", async (int id, CreateRenovationPurchaseRequest request, IMediator mediator) =>
            await mediator.Send(new CreateRenovationPurchaseCommand(id, request)))
        .WithName("CreateRenovationPurchase")
        .Produces<RenovationPurchaseResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}/purchases/{purchaseId}", async (int id, int purchaseId, IMediator mediator) =>
            await mediator.Send(new DeleteRenovationPurchaseCommand(id, purchaseId)))
        .WithName("DeleteRenovationPurchase")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();
    }

    private static void MapMaterials(RouteGroupBuilder group)
    {
        group.MapGet("/", async (IMediator mediator) =>
            await mediator.Send(new GetRenovationMaterialsQuery()))
        .WithName("GetRenovationMaterials")
        .RequireAuthorization();

        group.MapPost("/", async (SaveRenovationMaterialRequest request, IMediator mediator) =>
            await mediator.Send(new CreateRenovationMaterialCommand(request)))
        .WithName("CreateRenovationMaterial")
        .Produces<RenovationMaterialResponse>(StatusCodes.Status201Created)
        .Produces(400)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, SaveRenovationMaterialRequest request, IMediator mediator) =>
            await mediator.Send(new UpdateRenovationMaterialCommand(id, request)))
        .WithName("UpdateRenovationMaterial")
        .Produces(204)
        .Produces(400)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
            await mediator.Send(new DeleteRenovationMaterialCommand(id)))
        .WithName("DeleteRenovationMaterial")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();
    }
}
