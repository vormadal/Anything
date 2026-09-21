namespace Anything.Contracts.Notifications;

/// <summary>
/// One announcement the signed-in user sent, as a single row rather than the
/// per-recipient rows it actually became. Dispatch fans a send out into one
/// <c>Notification</c> per recipient sharing a single <c>CreatedOn</c>, so the
/// send is reconstructed by grouping on that timestamp plus the text.
/// <para>
/// <paramref name="Recipients"/> counts every copy created — including ones the
/// recipient has since dismissed, since dismissing doesn't unsend anything — so
/// the number never drops after the fact. <paramref name="ReadCount"/> counts
/// how many of those have been opened, and is the only reason this is worth a
/// page: the send dialog's toast already reported the recipient count once.
/// </para>
/// </summary>
public record SentNotificationResponse(
    string Category,
    string Title,
    string? Body,
    DateTime SentOn,
    int Recipients,
    int ReadCount);
