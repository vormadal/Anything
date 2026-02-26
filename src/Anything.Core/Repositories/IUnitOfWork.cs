namespace Anything.Core.Repositories;

public interface IUnitOfWork
{
    Task SaveChanges(CancellationToken ct = default);
}
