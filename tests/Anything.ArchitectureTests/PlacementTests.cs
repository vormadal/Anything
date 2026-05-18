using Anything.Core.Repositories;
using Anything.Core.Services;
using NetArchTest.Rules;
using Xunit;

namespace Anything.ArchitectureTests;

public class PlacementTests
{
    // Core.Services must contain only interfaces — no concrete service implementations.
    [Fact]
    public void CoreServicesNamespace_MustContainOnlyInterfaces() =>
        Types.InAssembly(Assemblies.Core)
            .That().ResideInNamespace("Anything.Core.Services")
            .Should().BeInterfaces()
            .GetResult().AssertSuccess();

    // Core.Repositories must contain only interfaces — Repository<T> and UnitOfWork
    // implementations belong in Anything.Database.
    [Fact]
    public void CoreRepositoriesNamespace_MustContainOnlyInterfaces() =>
        Types.InAssembly(Assemblies.Core)
            .That().ResideInNamespace("Anything.Core.Repositories")
            .Should().BeInterfaces()
            .GetResult().AssertSuccess();

    // All IRepository<T> implementations must live in Anything.Database — not in
    // Application or API.
    [Fact]
    public void RepositoryImplementations_MustResideIn_Database() =>
        Types.InAssembly(Assemblies.Database)
            .That().ImplementInterface(typeof(IRepository<>))
            .Should().ResideInNamespace("Anything.Database")
            .GetResult().AssertSuccess();

    [Fact]
    public void RepositoryImplementations_MustNotExist_InApplication()
    {
        var violations = Types.InAssembly(Assemblies.Application)
            .That().ImplementInterface(typeof(IRepository<>))
            .GetTypes();

        Assert.Empty(violations);
    }

    // IUnitOfWork implementations must live in Anything.Database.
    [Fact]
    public void UnitOfWorkImplementation_MustResideIn_Database() =>
        Types.InAssembly(Assemblies.Database)
            .That().ImplementInterface(typeof(IUnitOfWork))
            .Should().ResideInNamespace("Anything.Database")
            .GetResult().AssertSuccess();

    // Core service contracts (IPasswordService, ITokenService, IHouseholdContext,
    // IImageStorageService) must be implemented inside Anything.Application.Services.
    // This prevents accidental implementations in Database or API.
    [Fact]
    public void CoreServiceImplementations_MustResideIn_ApplicationServices()
    {
        var coreServiceInterfaces = new Type[]
        {
            typeof(IPasswordService),
            typeof(ITokenService),
            typeof(IHouseholdContext),
            typeof(IImageStorageService),
        };

        foreach (var iface in coreServiceInterfaces)
        {
            Types.InAssembly(Assemblies.Application)
                .That().ImplementInterface(iface)
                .Should().ResideInNamespace("Anything.Application.Services")
                .GetResult().AssertSuccess();
        }
    }

    // No Core service contracts should be implemented in the Database layer.
    [Fact]
    public void Database_MustNotImplement_CoreServiceInterfaces()
    {
        var coreServiceInterfaces = new Type[]
        {
            typeof(IPasswordService),
            typeof(ITokenService),
            typeof(IHouseholdContext),
            typeof(IImageStorageService),
        };

        foreach (var iface in coreServiceInterfaces)
        {
            var violations = Types.InAssembly(Assemblies.Database)
                .That().ImplementInterface(iface)
                .GetTypes();

            Assert.Empty(violations);
        }
    }
}
