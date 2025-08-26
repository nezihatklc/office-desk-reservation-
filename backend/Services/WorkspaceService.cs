using backend.DTOs;
using backend.Models;
using backend.Repositories;
using backend.Exceptions;

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
        public async Task<Workspace> GetByIdAsync(int id)
        {
            var workspace = await _workspaceRepository.GetByIdAsync(id);
            if (workspace == null)
            {
                throw new NotFoundException($"Workspace with id {id} not found.");
            }
            return workspace;
        }
        public Task AddAsync(Workspace workspace) => _workspaceRepository.AddAsync(workspace);
        public async Task UpdateAsync(Workspace workspace)
        {
            var existing = await _workspaceRepository.GetByIdAsync(workspace.WorkspaceId);
            if (existing == null)
            {
                throw new NotFoundException($"Workspace with id {workspace.WorkspaceId} not found.");
            }

            await _workspaceRepository.UpdateAsync(workspace);
        }
        public async Task DeleteAsync(int id)
        {
            var existing = await _workspaceRepository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new NotFoundException($"Workspace with id {id} not found.");
            }
            await _workspaceRepository.DeleteAsync(id);
        }
        
        
    }
}