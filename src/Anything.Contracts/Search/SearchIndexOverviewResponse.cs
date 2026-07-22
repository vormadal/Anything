namespace Anything.Contracts.Search;

public record SearchIndexTypeCount(string EntityType, int Count);

/// <summary>Household-scoped summary of what's currently indexed — an "is search healthy/populated" view, not a document browser.</summary>
public record SearchIndexOverviewResponse(int TotalDocuments, List<SearchIndexTypeCount> ByType, DateTime? LastIndexedOn);
