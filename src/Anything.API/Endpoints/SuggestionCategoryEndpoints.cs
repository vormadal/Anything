using Anything.Application.Features.SuggestionCategories.Commands;
using Anything.Application.Features.SuggestionCategories.Queries;
using Anything.Contracts.SuggestionCategories;
using Anything.Core.Constants;
using Anything.Core.Entities;
using Anything.Mediator;
using Microsoft.AspNetCore.Mvc;

namespace Anything.API.Endpoints;

public static class SuggestionCategoryEndpoints
{
    public static void MapSuggestionCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/suggestion-categories");

        group.MapGet("/", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetSuggestionCategoriesQuery());
        })
        .WithName("GetSuggestionCategories")
        .Produces<List<SuggestionCategory>>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/", async ([FromBody] CreateSuggestionCategoryRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new CreateSuggestionCategoryCommand(request.Name));
        })
        .WithName("CreateSuggestionCategory")
        .Produces<SuggestionCategory>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapPut("/reorder", async ([FromBody] ReorderSuggestionCategoriesRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ReorderSuggestionCategoriesCommand(request.Ids));
        })
        .WithName("ReorderSuggestionCategories")
        .Produces(StatusCodes.Status204NoContent)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapPut("/{id}", async (int id, [FromBody] UpdateSuggestionCategoryRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateSuggestionCategoryCommand(id, request.Name));
        })
        .WithName("UpdateSuggestionCategory")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteSuggestionCategoryCommand(id));
        })
        .WithName("DeleteSuggestionCategory")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .RequireAuthorization(UserRoles.Admin);

        group.MapGet("/export", async (IMediator mediator) =>
        {
            return await mediator.Send(new ExportSuggestionCategoriesQuery());
        })
        .WithName("ExportSuggestionCategories")
        .Produces<ExportSuggestionCategoriesResponse>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        group.MapPost("/import", async ([FromBody] ImportSuggestionCategoriesRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new ImportSuggestionCategoriesCommand(request.Categories));
        })
        .WithName("ImportSuggestionCategories")
        .Produces(StatusCodes.Status204NoContent)
        .WithParameterValidation()
        .RequireAuthorization(UserRoles.Admin);
    }
}
