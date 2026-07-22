namespace Anything.Core.Constants;

public static class HomeCardKeys
{
    public const string QuickCreate = "quickcreate";
    public const string FoodPlan = "foodplan";
    public const string Bills = "bills";
    public const string Lists = "lists";
    public const string Search = "search";

    /// <summary>
    /// Known home page cards in their default display order.
    /// </summary>
    public static readonly IReadOnlyList<string> All = [QuickCreate, FoodPlan, Lists, Bills, Search];
}
