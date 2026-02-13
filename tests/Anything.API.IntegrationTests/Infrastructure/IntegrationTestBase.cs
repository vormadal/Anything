using Anything.API.IntegrationTests.ApiClient;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using Xunit;

namespace Anything.API.IntegrationTests.Infrastructure;

[Collection(IntegrationTestCollection.Name)]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly PostgresContainerFixture Postgres;
    private AnythingApiFactory? _factory;

    protected AnythingApiFactory Factory => _factory
        ?? throw new InvalidOperationException("Factory not initialized. Call InitializeAsync first.");

    protected AnythingApiClient Client { get; private set; } = null!;

    protected IntegrationTestBase(PostgresContainerFixture postgres)
    {
        Postgres = postgres;
    }

    public async ValueTask InitializeAsync()
    {
        _factory = new AnythingApiFactory(Postgres.ConnectionString);
        await _factory.EnsureDatabaseCreatedAsync();
        await _factory.ResetDatabaseAsync();

        var httpClient = _factory.CreateClient();
        var adapter = new HttpClientRequestAdapter(
            new AnonymousAuthenticationProvider(),
            httpClient: httpClient)
        {
            BaseUrl = httpClient.BaseAddress?.ToString().TrimEnd('/') ?? ""
        };
        Client = new AnythingApiClient(adapter);
    }

    public async ValueTask DisposeAsync()
    {
        if (_factory != null)
            await _factory.DisposeAsync();
    }
}
