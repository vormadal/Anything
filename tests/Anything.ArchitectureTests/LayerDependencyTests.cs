using NetArchTest.Rules;
using Xunit;

namespace Anything.ArchitectureTests;

public class LayerDependencyTests
{
    [Fact]
    public void Core_MustNotDependOn_Application() =>
        Types.InAssembly(Assemblies.Core)
            .Should().NotHaveDependencyOn("Anything.Application")
            .GetResult().AssertSuccess();

    [Fact]
    public void Core_MustNotDependOn_Database() =>
        Types.InAssembly(Assemblies.Core)
            .Should().NotHaveDependencyOn("Anything.Database")
            .GetResult().AssertSuccess();

    [Fact]
    public void Core_MustNotDependOn_Contracts() =>
        Types.InAssembly(Assemblies.Core)
            .Should().NotHaveDependencyOn("Anything.Contracts")
            .GetResult().AssertSuccess();

    [Fact]
    public void Core_MustNotDependOn_Mediator() =>
        Types.InAssembly(Assemblies.Core)
            .Should().NotHaveDependencyOn("Anything.Mediator")
            .GetResult().AssertSuccess();

    [Fact]
    public void Core_MustNotDependOn_API() =>
        Types.InAssembly(Assemblies.Core)
            .Should().NotHaveDependencyOn("Anything.API")
            .GetResult().AssertSuccess();

    [Fact]
    public void Contracts_MustNotDependOn_Core() =>
        Types.InAssembly(Assemblies.Contracts)
            .Should().NotHaveDependencyOn("Anything.Core")
            .GetResult().AssertSuccess();

    [Fact]
    public void Contracts_MustNotDependOn_Application() =>
        Types.InAssembly(Assemblies.Contracts)
            .Should().NotHaveDependencyOn("Anything.Application")
            .GetResult().AssertSuccess();

    [Fact]
    public void Contracts_MustNotDependOn_Database() =>
        Types.InAssembly(Assemblies.Contracts)
            .Should().NotHaveDependencyOn("Anything.Database")
            .GetResult().AssertSuccess();

    [Fact]
    public void Contracts_MustNotDependOn_Mediator() =>
        Types.InAssembly(Assemblies.Contracts)
            .Should().NotHaveDependencyOn("Anything.Mediator")
            .GetResult().AssertSuccess();

    [Fact]
    public void Contracts_MustNotDependOn_API() =>
        Types.InAssembly(Assemblies.Contracts)
            .Should().NotHaveDependencyOn("Anything.API")
            .GetResult().AssertSuccess();

    [Fact]
    public void Mediator_MustNotDependOn_Core() =>
        Types.InAssembly(Assemblies.Mediator)
            .Should().NotHaveDependencyOn("Anything.Core")
            .GetResult().AssertSuccess();

    [Fact]
    public void Mediator_MustNotDependOn_Application() =>
        Types.InAssembly(Assemblies.Mediator)
            .Should().NotHaveDependencyOn("Anything.Application")
            .GetResult().AssertSuccess();

    [Fact]
    public void Mediator_MustNotDependOn_Database() =>
        Types.InAssembly(Assemblies.Mediator)
            .Should().NotHaveDependencyOn("Anything.Database")
            .GetResult().AssertSuccess();

    [Fact]
    public void Mediator_MustNotDependOn_Contracts() =>
        Types.InAssembly(Assemblies.Mediator)
            .Should().NotHaveDependencyOn("Anything.Contracts")
            .GetResult().AssertSuccess();

    [Fact]
    public void Mediator_MustNotDependOn_API() =>
        Types.InAssembly(Assemblies.Mediator)
            .Should().NotHaveDependencyOn("Anything.API")
            .GetResult().AssertSuccess();

    [Fact]
    public void Application_MustNotDependOn_Database() =>
        Types.InAssembly(Assemblies.Application)
            .Should().NotHaveDependencyOn("Anything.Database")
            .GetResult().AssertSuccess();

    [Fact]
    public void Application_MustNotDependOn_API() =>
        Types.InAssembly(Assemblies.Application)
            .Should().NotHaveDependencyOn("Anything.API")
            .GetResult().AssertSuccess();

    [Fact]
    public void Database_MustNotDependOn_Application() =>
        Types.InAssembly(Assemblies.Database)
            .Should().NotHaveDependencyOn("Anything.Application")
            .GetResult().AssertSuccess();

    [Fact]
    public void Database_MustNotDependOn_Contracts() =>
        Types.InAssembly(Assemblies.Database)
            .Should().NotHaveDependencyOn("Anything.Contracts")
            .GetResult().AssertSuccess();

    [Fact]
    public void Database_MustNotDependOn_Mediator() =>
        Types.InAssembly(Assemblies.Database)
            .Should().NotHaveDependencyOn("Anything.Mediator")
            .GetResult().AssertSuccess();

    [Fact]
    public void Database_MustNotDependOn_API() =>
        Types.InAssembly(Assemblies.Database)
            .Should().NotHaveDependencyOn("Anything.API")
            .GetResult().AssertSuccess();
}
