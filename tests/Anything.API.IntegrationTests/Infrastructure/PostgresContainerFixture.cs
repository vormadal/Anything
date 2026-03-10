using Testcontainers.PostgreSql;
using Xunit;

namespace Anything.API.IntegrationTests.Infrastructure;

public class PostgresContainerFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:17-alpine")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public AnythingApiFactory Factory { get; private set; } = null!;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();
        Factory = new AnythingApiFactory(ConnectionString);
        await Factory.EnsureDatabaseCreatedAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await Factory.DisposeAsync();
        await _container.DisposeAsync();
    }
}
