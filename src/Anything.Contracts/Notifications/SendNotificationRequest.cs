using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Notifications;

/// <summary>
/// A household manager's announcement to the household. There is deliberately no
/// link or category field: a caller-supplied link is an open-redirect surface,
/// and the category is fixed to <c>announcement</c> so a send can't bypass the
/// recipient's opt-out for some other category.
/// </summary>
public record SendNotificationRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(2000)] string? Body = null,
    bool IncludeSelf = false);
