namespace Anything.Core.Constants;

public static class HomeCardKeys
{
    public const string QuickCreate = "quickcreate";
    public const string FoodPlan = "foodplan";
    public const string Bills = "bills";
    public const string Lists = "lists";
    public const string Search = "search";
    public const string Notes = "notes";

    /// <summary>
    /// Known home page cards in their default display order. Cards absent from a
    /// user's stored preferences are appended as visible, so adding a key here
    /// makes the new card show up by default for existing users too.
    /// </summary>
    public static readonly IReadOnlyList<string> All = [QuickCreate, FoodPlan, Notes, Lists, Bills, Search];
}
