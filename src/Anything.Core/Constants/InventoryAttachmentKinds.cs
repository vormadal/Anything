namespace Anything.Core.Constants;

/// <summary>Values stored in <see cref="Entities.InventoryAttachment.Kind"/>.</summary>
public static class InventoryAttachmentKinds
{
    public const string Photo = "Photo";
    public const string Manual = "Manual";
    public const string Receipt = "Receipt";
    public const string Warranty = "Warranty";
    public const string Other = "Other";

    public static readonly IReadOnlySet<string> All = new HashSet<string>
    {
        Photo, Manual, Receipt, Warranty, Other
    };
}
