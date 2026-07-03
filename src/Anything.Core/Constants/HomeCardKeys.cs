namespace Anything.Core.Constants;

public static class HomeCardKeys
{
    public const string FoodPlan = "foodplan";
    public const string Bills = "bills";
    public const string Lists = "lists";

    /// <summary>
    /// Known home page cards in their default display order.
    /// </summary>
    public static readonly IReadOnlyList<string> All = [FoodPlan, Lists, Bills];
}
