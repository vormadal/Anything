namespace Anything.Mediator;

public class Mediator(IServiceProvider serviceProvider) : IMediator
{
    public async Task Send(IRequest request, CancellationToken ct = default)
    {
        var requestType = request.GetType();
        var handlerType = typeof(IRequestHandler<>).MakeGenericType(requestType);
        var handler = serviceProvider.GetService(handlerType)
            ?? throw new InvalidOperationException($"No handler registered for {requestType.Name}");

        var method = handlerType.GetMethod("Handle")
            ?? throw new InvalidOperationException($"Handle method not found on handler for {requestType.Name}");

        var task = (Task)method.Invoke(handler, [request, ct])!;
        await task;
    }

    public async Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken ct = default)
    {
        var requestType = request.GetType();
        var handlerType = typeof(IRequestHandler<,>).MakeGenericType(requestType, typeof(TResponse));
        var handler = serviceProvider.GetService(handlerType)
            ?? throw new InvalidOperationException($"No handler registered for {requestType.Name}");

        var method = handlerType.GetMethod("Handle")
            ?? throw new InvalidOperationException($"Handle method not found on handler for {requestType.Name}");

        var task = (Task<TResponse>)method.Invoke(handler, [request, ct])!;
        return await task;
    }
}
