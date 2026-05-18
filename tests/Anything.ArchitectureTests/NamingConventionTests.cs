using Anything.Mediator;
using NetArchTest.Rules;
using Xunit;

namespace Anything.ArchitectureTests;

public class NamingConventionTests
{
    // All types in Application that implement IRequest<T> are command/query messages —
    // they must end with "Command" or "Query".
    [Fact]
    public void RequestTypes_MustEndWith_CommandOrQuery()
    {
        var requestTypes = Types.InAssembly(Assemblies.Application)
            .That()
            .ImplementInterface(typeof(IRequest<>))
            .GetTypes();

        var violations = requestTypes
            .Where(t => !t.Name.EndsWith("Command") && !t.Name.EndsWith("Query"))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(violations);
    }

    // All handler classes must end with "Handler".
    // This covers both IRequestHandler<TReq, TResp> and the void IRequestHandler<TReq>.
    [Fact]
    public void HandlerTypes_MustEndWith_Handler()
    {
        var handlerTypes = Types.InAssembly(Assemblies.Application)
            .That().ImplementInterface(typeof(IRequestHandler<,>))
            .GetTypes()
            .Concat(
                Types.InAssembly(Assemblies.Application)
                    .That().ImplementInterface(typeof(IRequestHandler<>))
                    .GetTypes())
            .Distinct();

        var violations = handlerTypes
            .Where(t => !t.Name.EndsWith("Handler"))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(violations);
    }

    // All handler classes must live inside the Features namespace — not in Services
    // or other sub-namespaces of Application.
    [Fact]
    public void HandlerTypes_MustResideIn_FeaturesNamespace()
    {
        Types.InAssembly(Assemblies.Application)
            .That().ImplementInterface(typeof(IRequestHandler<,>))
            .Should().ResideInNamespace("Anything.Application.Features")
            .GetResult().AssertSuccess();

        Types.InAssembly(Assemblies.Application)
            .That().ImplementInterface(typeof(IRequestHandler<>))
            .Should().ResideInNamespace("Anything.Application.Features")
            .GetResult().AssertSuccess();
    }

    // Endpoint classes must live in Anything.API.Endpoints.
    [Fact]
    public void EndpointClasses_MustResideIn_EndpointsNamespace() =>
        Types.InAssembly(Assemblies.Api)
            .That().HaveNameEndingWith("Endpoints")
            .Should().ResideInNamespace("Anything.API.Endpoints")
            .GetResult().AssertSuccess();
}
