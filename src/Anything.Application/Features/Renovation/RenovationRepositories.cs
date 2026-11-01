using Anything.Core.Entities;
using Anything.Core.Repositories;

namespace Anything.Application.Features.Renovation;

/// <summary>
/// The renovation feature's repositories in one injectable bundle. Almost every handler needs
/// four or more of them, and listing each one separately would push constructors past a
/// readable size without adding anything.
/// </summary>
public sealed class RenovationRepositories(
    IRepository<RenovationProject> projects,
    IRepository<RenovationRoom> rooms,
    IRepository<RenovationLine> lines,
    IRepository<RenovationMaterial> materials,
    IRepository<RenovationPurchase> purchases,
    IRepository<RenovationPurchaseAllocation> allocations)
{
    public IRepository<RenovationProject> Projects { get; } = projects;
    public IRepository<RenovationRoom> Rooms { get; } = rooms;
    public IRepository<RenovationLine> Lines { get; } = lines;
    public IRepository<RenovationMaterial> Materials { get; } = materials;
    public IRepository<RenovationPurchase> Purchases { get; } = purchases;
    public IRepository<RenovationPurchaseAllocation> Allocations { get; } = allocations;
}
