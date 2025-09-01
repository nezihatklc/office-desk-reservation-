using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class WorkspaceRepository : IWorkspaceRepository
    {
        private readonly AppDbContext _context;

        public WorkspaceRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Workspace>> GetAllAsync() =>
            await _context.Workspaces.ToListAsync();

        public async Task<Workspace?> GetByIdAsync(int id) =>
            await _context.Workspaces.FirstOrDefaultAsync(w => w.WorkspaceId == id);

        public async Task AddAsync(Workspace workspace)
        {
            _context.Workspaces.Add(workspace);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Workspace workspace)
        {
            _context.Workspaces.Update(workspace);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var workspace = await _context.Workspaces.FindAsync(id);
            if (workspace != null)
            {
                _context.Workspaces.Remove(workspace);
                await _context.SaveChangesAsync();
            }
        }
    }
}