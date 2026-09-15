using System.Security.Cryptography;
using Anything.Application.Configuration;
using Anything.Application.Features.Notifications.Commands;
using Anything.Application.Features.Notifications.Queries;
using Anything.Application.Notifications;
using Anything.Application.UnitTests.Helpers;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace Anything.Application.UnitTests.Features.Notifications;

public abstract class PushDeviceTestBase
{
    protected const int UserId = 3;
    protected const string Endpoint = "https://push.example.com/abc123";
    protected static readonly DateTime Now = new(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc);

    protected readonly IRepository<PushDevice> Repo = Substitute.For<IRepository<PushDevice>>();
    protected readonly IUnitOfWork UnitOfWork = Substitute.For<IUnitOfWork>();
    protected readonly TimeProvider Time = Substitute.For<TimeProvider>();

    protected PushDeviceTestBase()
    {
        Time.GetUtcNow().Returns(new DateTimeOffset(Now, TimeSpan.Zero));
        SeedDevices();
    }

    protected void SeedDevices(params PushDevice[] devices) =>
        Repo.Query().Returns(devices.ToList().AsAsyncQueryable());

    /// <summary>
    /// A genuinely valid P-256 pair, generated per test run. Hard-coded
    /// placeholder strings are not safe here: VapidAuthentication parses the
    /// keys when it is constructed, so anything that isn't a real key would
    /// fail inside the helper rather than in the code under test.
    /// </summary>
    protected static VapidCredentials Configured()
    {
        using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var parameters = ecdsa.ExportParameters(includePrivateParameters: true);

        // Uncompressed point (0x04 || X || Y) is the encoding VAPID expects.
        var publicKey = new byte[65];
        publicKey[0] = 0x04;
        parameters.Q.X!.CopyTo(publicKey, 1);
        parameters.Q.Y!.CopyTo(publicKey, 33);

        return new VapidCredentials(Options.Create(new PushSettings
        {
            PublicKey = Base64Url(publicKey),
            PrivateKey = Base64Url(parameters.D!),
            Subject = "mailto:ops@example.com"
        }));
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    protected static VapidCredentials Unconfigured() => new(Options.Create(new PushSettings()));
}

public class RegisterPushDeviceHandlerTests : PushDeviceTestBase
{
    private RegisterPushDeviceHandler CreateHandler(VapidCredentials credentials) =>
        new(Repo, UnitOfWork, Time, credentials);

    private static RegisterPushDeviceCommand Command(int userId = UserId, string endpoint = Endpoint) =>
        new(userId, endpoint, "p256dh-key", "auth-key", "Firefox on Android");

    [Fact]
    public async Task Handle_AddsANewDevice()
    {
        using var credentials = Configured();

        var result = await CreateHandler(credentials)
            .Handle(Command(), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Repo.Received(1).Add(Arg.Is<PushDevice>(d =>
            d.UserId == UserId
            && d.Endpoint == Endpoint
            && d.P256dhKey == "p256dh-key"
            && d.AuthKey == "auth-key"
            && d.UserAgent == "Firefox on Android"
            && d.CreatedOn == Now
            && d.LastSeenOn == Now));
        await UnitOfWork.Received(1).SaveChanges(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTheEndpointIsAlreadyKnown_RefreshesItInsteadOfAddingASecondRow()
    {
        var existing = new PushDevice
        {
            Id = 1,
            UserId = UserId,
            Endpoint = Endpoint,
            P256dhKey = "old-key",
            AuthKey = "old-auth",
            CreatedOn = Now.AddDays(-30)
        };
        SeedDevices(existing);
        using var credentials = Configured();

        await CreateHandler(credentials).Handle(Command(), TestContext.Current.CancellationToken);

        Repo.DidNotReceiveWithAnyArgs().Add(default!);
        Assert.Equal("p256dh-key", existing.P256dhKey);
        Assert.Equal("auth-key", existing.AuthKey);
        Assert.Equal(Now, existing.LastSeenOn);
    }

    [Fact]
    public async Task Handle_RevivesADeviceThatWasPrunedOrUnsubscribed()
    {
        var existing = new PushDevice
        {
            Id = 1,
            UserId = UserId,
            Endpoint = Endpoint,
            P256dhKey = "k",
            AuthKey = "a",
            DeletedOn = Now.AddDays(-1)
        };
        SeedDevices(existing);
        using var credentials = Configured();

        await CreateHandler(credentials).Handle(Command(), TestContext.Current.CancellationToken);

        Assert.Null(existing.DeletedOn);
    }

    [Fact]
    public async Task Handle_WhenTheBrowserChangedHands_MovesTheEndpointToTheNewUser()
    {
        // The endpoint is unique per browser, so a second user registering it
        // has to take it over — inserting would violate the unique index, and
        // leaving it would keep pushing to the previous account's owner.
        var existing = new PushDevice
        {
            Id = 1,
            UserId = 99,
            Endpoint = Endpoint,
            P256dhKey = "k",
            AuthKey = "a"
        };
        SeedDevices(existing);
        using var credentials = Configured();

        await CreateHandler(credentials).Handle(Command(), TestContext.Current.CancellationToken);

        Repo.DidNotReceiveWithAnyArgs().Add(default!);
        Assert.Equal(UserId, existing.UserId);
    }

    [Fact]
    public async Task Handle_WhenPushIsNotConfigured_RefusesRatherThanStoringADeadDevice()
    {
        using var credentials = Unconfigured();

        var result = await CreateHandler(credentials)
            .Handle(Command(), TestContext.Current.CancellationToken);

        Assert.IsType<ProblemHttpResult>(result);
        Repo.DidNotReceiveWithAnyArgs().Add(default!);
        await UnitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }
}

public class RemovePushDeviceHandlerTests : PushDeviceTestBase
{
    private RemovePushDeviceHandler CreateHandler() => new(Repo, UnitOfWork, Time);

    [Fact]
    public async Task Handle_SoftDeletesTheCallersDevice()
    {
        var device = new PushDevice
        {
            Id = 1,
            UserId = UserId,
            Endpoint = Endpoint,
            P256dhKey = "k",
            AuthKey = "a"
        };
        SeedDevices(device);

        var result = await CreateHandler()
            .Handle(new RemovePushDeviceCommand(UserId, Endpoint), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Equal(Now, device.DeletedOn);
    }

    [Fact]
    public async Task Handle_LeavesAnotherUsersDeviceAlone()
    {
        var device = new PushDevice
        {
            Id = 1,
            UserId = 99,
            Endpoint = Endpoint,
            P256dhKey = "k",
            AuthKey = "a"
        };
        SeedDevices(device);

        var result = await CreateHandler()
            .Handle(new RemovePushDeviceCommand(UserId, Endpoint), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        Assert.Null(device.DeletedOn);
        await UnitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }

    [Fact]
    public async Task Handle_IsIdempotentForAnAlreadyRemovedDevice()
    {
        var result = await CreateHandler()
            .Handle(new RemovePushDeviceCommand(UserId, Endpoint), TestContext.Current.CancellationToken);

        Assert.IsType<NoContent>(result);
        await UnitOfWork.DidNotReceiveWithAnyArgs().SaveChanges(default);
    }
}

public class GetPushConfigHandlerTests : PushDeviceTestBase
{
    [Fact]
    public async Task Handle_WhenConfigured_ReturnsThePublicKey()
    {
        using var credentials = Configured();

        var result = await new GetPushConfigHandler(credentials)
            .Handle(new GetPushConfigQuery(), TestContext.Current.CancellationToken);

        Assert.True(result.Enabled);
        Assert.Equal(credentials.PublicKey, result.PublicKey);
    }

    [Fact]
    public async Task Handle_WhenNotConfigured_ReportsDisabledWithNoKey()
    {
        using var credentials = Unconfigured();

        var result = await new GetPushConfigHandler(credentials)
            .Handle(new GetPushConfigQuery(), TestContext.Current.CancellationToken);

        Assert.False(result.Enabled);
        Assert.Null(result.PublicKey);
    }
}
