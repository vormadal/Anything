namespace Anything.Mediator;

public interface IMediator
{
    Task Send(IRequest request, CancellationToken ct = default);
    Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken ct = default);
}
