namespace Anything.Core.Entities;

/// <summary>
/// One browser's Web Push subscription, belonging to a user rather than a
/// household: the subscription is issued by the browser, and the same person
/// switching households keeps the same device. Recipients are resolved per
/// household when a notification is dispatched; their devices are looked up
/// afterwards, by user.
/// <para>
/// Named <c>PushDevice</c>, not <c>PushSubscription</c>, because
/// <c>Lib.Net.Http.WebPush</c> exports a type by that name and the sender has
/// to hold both.
/// </para>
/// </summary>
public class PushDevice
{
    public int Id { get; set; }
    public int UserId { get; set; }

    /// <summary>
    /// The push service URL the browser issued. Unique — re-subscribing the
    /// same browser yields the same endpoint, so registration is an upsert
    /// rather than a second row.
    /// </summary>
    public required string Endpoint { get; set; }

    /// <summary>Client public key (base64url), used to encrypt the payload.</summary>
    public required string P256dhKey { get; set; }

    /// <summary>Client auth secret (base64url), part of the same encryption.</summary>
    public required string AuthKey { get; set; }

    /// <summary>Whatever the browser reported, for a recognisable device list.</summary>
    public string? UserAgent { get; set; }

    public DateTime CreatedOn { get; set; }

    /// <summary>Last time this device was re-registered by the client.</summary>
    public DateTime? LastSeenOn { get; set; }

    /// <summary>
    /// Soft-deleted either by the user unsubscribing or by the push service
    /// answering 404/410, which means the browser dropped the subscription and
    /// the endpoint will never work again.
    /// </summary>
    public DateTime? DeletedOn { get; set; }
}
