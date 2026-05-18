using Anything.Mediator;
using NetArchTest.Rules;
using Xunit;

namespace Anything.ArchitectureTests;

public class CqrsPatternTests
{
    // Every class ending in "Handler" inside the Features namespace must implement
    // one of the two IRequestHandler variants. This catches typos, base-class-only
    // handler registrations, or handlers accidentally stripped of their interface.
    [Fact]
    public void ClassesNamedHandler_InFeatures_MustImplement_IRequestHandler()
    {
        var handlerTypes = Types.InAssembly(Assemblies.Application)
            .That()
            .HaveNameEndingWith("Handler")
            .And()
            .ResideInNamespace("Anything.Application.Features")
            .GetTypes();

        var violations = handlerTypes
            .Where(t => !t.GetInterfaces().Any(i =>
                i.IsGenericType && (
                    i.GetGenericTypeDefinition() == typeof(IRequestHandler<,>) ||
                    i.GetGenericTypeDefinition() == typeof(IRequestHandler<>))))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(violations);
    }

    // Every type ending in "Command" or "Query" inside Application must implement
    // IRequest<T> so the mediator can dispatch it.
    [Fact]
    public void CommandAndQueryTypes_MustImplement_IRequest()
    {
        var commandsAndQueries = Types.InAssembly(Assemblies.Application)
            .That()
            .ResideInNamespace("Anything.Application.Features")
            .GetTypes()
            .Where(t => t.Name.EndsWith("Command") || t.Name.EndsWith("Query"));

        var violations = commandsAndQueries
            .Where(t => !t.GetInterfaces().Any(i =>
                i == typeof(IRequest) ||
                (i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequest<>))))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(violations);
    }
}
