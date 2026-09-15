using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Notifications;

/// <summary>
/// A browser's `PushSubscription`, flattened. Re-sending the same endpoint
/// refreshes the existing device rather than adding another — browsers hand
/// back the same endpoint when a page re-subscribes, which happens on most
/// loads.
/// </summary>
public record RegisterPushDeviceRequest(
    [Required, StringLength(1000, MinimumLength = 1)] string Endpoint,
    [Required, StringLength(200, MinimumLength = 1)] string P256dhKey,
    [Required, StringLength(100, MinimumLength = 1)] string AuthKey,
    [StringLength(400)] string? UserAgent = null);

/// <summary>
/// Identified by endpoint rather than id: on unsubscribe the browser has the
/// `PushSubscription` in hand, not whatever row id the server assigned.
/// </summary>
public record RemovePushDeviceRequest(
    [Required, StringLength(1000, MinimumLength = 1)] string Endpoint);
