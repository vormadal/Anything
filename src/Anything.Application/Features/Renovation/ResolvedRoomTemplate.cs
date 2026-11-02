namespace Anything.Application.Features.Renovation;

/// <summary>A room type as one household sees it: the built-in default, or the household's own version of it.</summary>
/// <param name="IsBuiltIn">A built-in room type exists for this key.</param>
/// <param name="IsCustomised">The household's row replaces a built-in.</param>
public sealed record ResolvedRoomTemplate(RenovationRoomTemplates.Template Template, bool IsBuiltIn, bool IsCustomised)
{
    /// <summary>
    /// Lines of a household-owned template (a customised built-in or a household room type) copy
    /// their own price, unit and waste into a new room. Built-in lines keep the rule that the
    /// household's material of the same name supplies them.
    /// </summary>
    public bool CarriesOwnPrices => IsCustomised || !IsBuiltIn;
}
