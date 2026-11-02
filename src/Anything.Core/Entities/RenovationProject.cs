using Anything.Core.Search;

namespace Anything.Core.Entities;

/// <summary>
/// A household renovation project: a set of rooms whose budget lines add up to an estimate,
/// tracked against an optional target budget as purchases are recorded.
/// </summary>
public class RenovationProject : ISearchable
{
    public int Id { get; set; }
    public int HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Budget { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public DateTime? DeletedOn { get; set; }

    string ISearchable.SearchEntityType => SearchEntityTypes.RenovationProject;
    int ISearchable.SearchEntityId => Id;
    string ISearchable.SearchTitle => Name;

    // Notes is capped at 1000 characters on input, but the search row is written in a save that runs
    // after the user's write has committed, so the bound is enforced here as well (see SearchDocumentLimits).
    string ISearchable.SearchContent => SearchDocumentLimits.Truncate(Notes ?? string.Empty, SearchDocumentLimits.MaxContentLength);
}
