using Anything.Core.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Anything.Database.Repositories;

public class Repository<T>(ApplicationDbContext context) : IRepository<T> where T : class
{
    protected readonly DbSet<T> DbSet = context.Set<T>();

    public async Task<T?> GetById(int id) => await DbSet.FindAsync(id);
    public async Task<List<T>> GetAll() => await DbSet.ToListAsync();
    public IQueryable<T> Query() => DbSet.AsQueryable();
    public void Add(T entity) => DbSet.Add(entity);
    public void AddRange(IEnumerable<T> entities) => DbSet.AddRange(entities);
    public void Update(T entity) => DbSet.Update(entity);
    public void Remove(T entity) => DbSet.Remove(entity);
}
