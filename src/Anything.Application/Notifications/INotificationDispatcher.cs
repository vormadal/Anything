namespace Anything.Application.Notifications;

/// <summary>
/// The one way notifications are created. Resolves recipients, drops those who
/// switched the category off, skips duplicates, persists, and pushes a realtime
/// event so open clients refresh their badge.
/// </summary>
public interface INotificationDispatcher
{
    /// <summary>
    /// Fans <paramref name="dispatch"/> out and returns how many notifications
    /// were actually created (opt-outs and duplicates are not counted).
    /// <para>
    /// This commits: it calls <c>IUnitOfWork.SaveChanges</c> itself. Call it
    /// <em>after</em> the calling handler has saved its own work, so a failure
    /// to notify can never roll back the thing being notified about.
    /// </para>
    /// </summary>
    Task<int> Dispatch(NotificationDispatch dispatch, CancellationToken ct = default);
}
