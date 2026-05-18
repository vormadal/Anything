using System.Reflection;
using Anything.API.Endpoints;
using Anything.Application.Features.Somethings.Commands;
using Anything.Contracts.Bills;
using Anything.Core.Entities;
using Anything.Database;
using Anything.Mediator;

namespace Anything.ArchitectureTests;

internal static class Assemblies
{
    public static readonly Assembly Api         = typeof(SomethingEndpoints).Assembly;
    public static readonly Assembly Application = typeof(CreateSomethingHandler).Assembly;
    public static readonly Assembly Contracts   = typeof(BillResponse).Assembly;
    public static readonly Assembly Core        = typeof(Bill).Assembly;
    public static readonly Assembly Database    = typeof(ApplicationDbContext).Assembly;
    public static readonly Assembly Mediator    = typeof(IMediator).Assembly;
}
