namespace Anything.Core.Search;

/// <summary>
/// Column limits of the <c>SearchDocument</c> table, shared between the EF
/// configuration that enforces them and the <see cref="ISearchable"/>
/// implementations that must stay within them.
/// </summary>
/// <remarks>
/// An <see cref="ISearchable"/> whose projection overflows one of these fails
/// late and confusingly: <c>SearchIndexInterceptor</c> writes the document in a
/// second save that runs <em>after</em> the user's own write has committed, so
/// the entity is saved but indexing throws. Entities with unbounded bodies
/// (notes, long descriptions) must truncate to <see cref="MaxContentLength"/>
/// themselves — use <see cref="Truncate"/>.
/// </remarks>
public static class SearchDocumentLimits
{
    public const int MaxTitleLength = 200;
    public const int MaxContentLength = 5000;

    /// <summary>Clamps <paramref name="value"/> to <paramref name="maxLength"/> characters.</summary>
    public static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
