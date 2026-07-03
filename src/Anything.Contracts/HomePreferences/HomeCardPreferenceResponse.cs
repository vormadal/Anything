namespace Anything.Contracts.HomePreferences;

public record HomeCardPreferenceResponse(string CardKey, int SortOrder, bool IsVisible);
