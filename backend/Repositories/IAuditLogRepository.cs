using backend.Models;

namespace backend.Repositories
{
    public interface IAuditLogRepository
    {
        Task<List<AuditLog>> GetAllAsync();
        Task<AuditLog?> GetByIdAsync(int id);
        Task AddAsync(AuditLog log);
    }
}