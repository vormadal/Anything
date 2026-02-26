using Anything.Core.Repositories;

namespace Anything.Database.Repositories;

public class UnitOfWork(ApplicationDbContext context) : IUnitOfWork
{
    public async Task SaveChanges(CancellationToken ct = default)
    {
        await context.SaveChangesAsync(ct);
    }
}
