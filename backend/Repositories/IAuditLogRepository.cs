using backend.Models;

namespace backend.Repositories
{
    public interface IAuditLogRepository
    {
        Task<List<AuditLog>> GetAllAsync();
        Task<AuditLog?> GetByIdAsync(int id);
        Task AddAsync(AuditLog log);
        
        Task<List<AuditLog>> GetByUserIdAsync(int userId);
        Task<List<AuditLog>> GetByDateRangeAsync(DateTime start, DateTime end);
        Task<List<AuditLog>> GetPagedAsync(int page, int pageSize);
    }
}