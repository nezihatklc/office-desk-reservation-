using backend.Models;

namespace backend.Repositories
{
    public interface IDeskRepository
    {
        Task<List<Desk>> GetAllAsync();
        Task<Desk?> GetByIdAsync(int id);
        Task AddAsync(Desk desk);
        Task UpdateAsync(Desk desk);
        Task DeleteAsync(int id);
    }
}