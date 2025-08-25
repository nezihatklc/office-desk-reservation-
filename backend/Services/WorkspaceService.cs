using backend.Models;
using backend.Repositories;

namespace backend.Services
{
    public class WorkspaceService
    {
        private readonly IWorkspaceRepository _workspaceRepository;

        public WorkspaceService(IWorkspaceRepository workspaceRepository)
        {
            _workspaceRepository = workspaceRepository;
        }

        public Task<List<Workspace>> GetAllAsync() => _workspaceRepository.GetAllAsync();
        public Task<Workspace?> GetByIdAsync(int id) => _workspaceRepository.GetByIdAsync(id);
        public Task AddAsync(Workspace workspace) => _workspaceRepository.AddAsync(workspace);
        public Task UpdateAsync(Workspace workspace) => _workspaceRepository.UpdateAsync(workspace);
        public Task DeleteAsync(int id) => _workspaceRepository.DeleteAsync(id);
    }
}