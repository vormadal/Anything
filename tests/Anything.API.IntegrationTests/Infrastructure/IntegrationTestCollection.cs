using Xunit;

namespace Anything.API.IntegrationTests.Infrastructure;

[CollectionDefinition(Name)]
public class IntegrationTestCollection : ICollectionFixture<PostgresContainerFixture>
{
    public const string Name = "Integration";
}
