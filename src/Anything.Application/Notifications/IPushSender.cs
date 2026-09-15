namespace Anything.Application.Notifications;

/// <summary>
/// Delivers one <see cref="PushDispatch"/> to every live device of its
/// recipients. Implementations never throw: push is best-effort, and the
/// notification it accompanies is already committed.
/// </summary>
public interface IPushSender
{
    Task Send(PushDispatch dispatch, CancellationToken ct = default);
}
