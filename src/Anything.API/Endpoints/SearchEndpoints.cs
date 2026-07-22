using Anything.API.Authorization;
using Anything.Application.Features.Search.Commands;
using Anything.Application.Features.Search.Queries;
using Anything.Contracts.Search;
using Anything.Core.Constants;
using Anything.Mediator;

namespace Anything.API.Endpoints;

public class SearchQueryParameters
{
    public string? Term { get; set; }

    // Must be nullable: a non-nullable value-type property bound via
    // [AsParameters] has no visible "optional" marker to ASP.NET Core's minimal
    // API binding metadata (a C# field initializer isn't reflection-visible),
    // so a request that omits ?limit= gets a 400 instead of falling back to a
    // default. Apply the actual default (20) where it's consumed below.
    public int? Limit { get; set; }
}

public static class SearchEndpoints
{
    private const int DefaultSearchLimit = 20;

    public static void MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/search");

        group.MapGet("/", async ([AsParameters] SearchQueryParameters parameters, IMediator mediator) =>
        {
            return await mediator.Send(new GetSearchResultsQuery(parameters.Term ?? string.Empty, parameters.Limit ?? DefaultSearchLimit));
        })
        .WithName("SearchAcrossEntities")
        .Produces<List<SearchResultResponse>>()
        .RequireAuthorization();

        // Household-scoped "is search populated/healthy" summary for the
        // household admin — not a full document browser.
        group.MapGet("/overview", async (IMediator mediator) =>
        {
            return await mediator.Send(new GetSearchIndexOverviewQuery());
        })
        .WithName("GetSearchIndexOverview")
        .Produces<SearchIndexOverviewResponse>()
        .RequireAuthorization()
        .RequireHouseholdManager();

        // Admin-only backfill/repair operation — not run automatically. See
        // RebuildSearchIndexCommand for when to use it.
        group.MapPost("/rebuild-index", async (IMediator mediator) =>
        {
            return await mediator.Send(new RebuildSearchIndexCommand());
        })
        .WithName("RebuildSearchIndex")
        .Produces<RebuildSearchIndexResponse>(StatusCodes.Status200OK)
        .RequireAuthorization(UserRoles.Admin);

        // Household-manager self-serve variant: rebuilds only the caller's own
        // household, so backfilling data indexed before this feature shipped
        // doesn't require the global admin role.
        group.MapPost("/rebuild-index/household", async (IMediator mediator) =>
        {
            return await mediator.Send(new RebuildHouseholdSearchIndexCommand());
        })
        .WithName("RebuildHouseholdSearchIndex")
        .Produces<RebuildSearchIndexResponse>(StatusCodes.Status200OK)
        .RequireAuthorization()
        .RequireHouseholdManager();
    }
}
