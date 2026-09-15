using Anything.Application.Notifications;
using Anything.Contracts.Notifications;
using Anything.Mediator;

namespace Anything.Application.Features.Notifications.Queries;

/// <summary>
/// The VAPID public key a browser needs to subscribe, or a flat "off" when the
/// deployment has no keys configured.
/// </summary>
public record GetPushConfigQuery : IRequest<PushConfigResponse>;

public class GetPushConfigHandler(VapidCredentials credentials)
    : IRequestHandler<GetPushConfigQuery, PushConfigResponse>
{
    public Task<PushConfigResponse> Handle(GetPushConfigQuery query, CancellationToken ct = default) =>
        Task.FromResult(new PushConfigResponse(credentials.IsConfigured, credentials.PublicKey));
}
