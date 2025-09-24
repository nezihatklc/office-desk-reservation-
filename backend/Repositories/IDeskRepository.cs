using backend.Models;

namespace backend.Repositories
{
    public interface IDeskRepository
    {
        Task<List<Desk>> GetAllAsync();
        Task<Desk?> GetByIdAsync(int id);
        Task<Desk> AddAsync(Desk desk);
        Task UpdateAsync(Desk desk);
        Task DeleteAsync(int id);
    }
}