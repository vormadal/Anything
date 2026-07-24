using Anything.Application.Features.Notes.Commands;
using Anything.Application.Features.Notes.Queries;
using Anything.Contracts.Notes;
using Anything.Mediator;
using MinimalApis.Extensions.Binding;

namespace Anything.API.Endpoints;

public class NoteListQueryParameters
{
    // Nullable for the same reason as SearchQueryParameters.Limit: a
    // non-nullable value type bound via [AsParameters] has no reflection-visible
    // "optional" marker, so omitting ?limit= would 400 instead of defaulting.
    public int? Limit { get; set; }
}

public static class NoteEndpoints
{
    public static void MapNoteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notes");

        group.MapGet("/", async ([AsParameters] NoteListQueryParameters parameters, IMediator mediator) =>
        {
            return await mediator.Send(new GetNotesQuery(parameters.Limit));
        })
        .WithName("GetNotes")
        .Produces<List<NoteSummaryResponse>>()
        .RequireAuthorization();

        group.MapGet("/{id}", async (int id, IMediator mediator) =>
        {
            var note = await mediator.Send(new GetNoteByIdQuery(id));
            return note is not null ? Results.Ok(note) : Results.NotFound();
        })
        .WithName("GetNoteById")
        .Produces<NoteResponse>()
        .Produces(404)
        .RequireAuthorization();

        group.MapPost("/", async (CreateNoteRequest request, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateNoteCommand(request.Title, request.ContentJson));
            return Results.Created($"/api/notes/{result.Id}", result);
        })
        .WithName("CreateNote")
        .Produces<NoteResponse>(StatusCodes.Status201Created)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapPut("/{id}", async (int id, UpdateNoteRequest request, IMediator mediator) =>
        {
            return await mediator.Send(new UpdateNoteCommand(id, request.Title, request.ContentJson));
        })
        .WithName("UpdateNote")
        .Produces(204)
        .Produces(404)
        .WithParameterValidation()
        .RequireAuthorization();

        group.MapDelete("/{id}", async (int id, IMediator mediator) =>
        {
            return await mediator.Send(new DeleteNoteCommand(id));
        })
        .WithName("DeleteNote")
        .Produces(204)
        .Produces(404)
        .RequireAuthorization();
    }
}
