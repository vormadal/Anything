using Anything.Application.Features.Search.Commands;
using Anything.Application.Features.Search.Queries;
using Anything.Contracts.Search;
using Anything.Core.Constants;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public class SearchQueryParameters
{
    public string? Term { get; set; }
    public int Limit { get; set; } = 20;
}

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/search");

        group.MapGet("/", async ([AsParameters] SearchQueryParameters parameters, IMediator mediator) =>
        {
            return await mediator.Send(new GetSearchResultsQuery(parameters.Term ?? string.Empty, parameters.Limit));
        })
        .WithName("SearchAcrossEntities")
        .Produces<List<SearchResultResponse>>()
        .RequireAuthorization();

        // Admin-only backfill/repair operation — not run automatically. See
        // RebuildSearchIndexCommand for when to use it.
        group.MapPost("/rebuild-index", async (IMediator mediator) =>
        {
            var count = await mediator.Send(new RebuildSearchIndexCommand());
            return Results.Ok(new { Indexed = count });
        })
        .WithName("RebuildSearchIndex")
        .Produces(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);
    }
}
