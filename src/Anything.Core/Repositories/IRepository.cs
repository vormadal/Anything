namespace Anything.Core.Repositories;

public interface IRepository<T> where T : class
{
    Task<T?> GetById(int id);
    Task<List<T>> GetAll();
    IQueryable<T> Query();
    void Add(T entity);
    void AddRange(IEnumerable<T> entities);
    void Update(T entity);
    void Remove(T entity);
}
