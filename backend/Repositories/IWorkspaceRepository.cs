


using backend.Models;

namespace backend.Repositories
{
    public interface IWorkspaceRepository
    {
        Task<List<Workspace>> GetAllAsync();
        Task<Workspace?> GetByIdAsync(int id);
        Task AddAsync(Workspace workspace);
        Task UpdateAsync(Workspace workspace);
        Task DeleteAsync(int id);
    }
}
