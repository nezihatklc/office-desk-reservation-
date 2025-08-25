using backend.Models;

namespace backend.Repositories
{
    public interface IFacilityRepository
    {
        Task<List<Facility>> GetAllAsync();
        Task<Facility?> GetByIdAsync(int id);
        Task AddAsync(Facility facility);
        Task UpdateAsync(Facility facility);
        Task DeleteAsync(int id);
    }
}