using backend.Models;
using backend.Repositories;
using backend.Exceptions;

namespace backend.Services
{
    public class AuditLogService
    {
        private readonly IAuditLogRepository _auditLogRepository;

        public AuditLogService(IAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        public Task<List<AuditLog>> GetAllAsync() => _auditLogRepository.GetAllAsync();
        public Task<AuditLog?> GetByIdAsync(int id) => _auditLogRepository.GetByIdAsync(id);

        public async Task AddAsync(AuditLog log)
        {
            if (string.IsNullOrWhiteSpace(log.Action))
                throw new BadRequestException("Action is required for audit logs.");

            log.LogTime = DateTime.UtcNow;
            await _auditLogRepository.AddAsync(log);
            
        }
        
        public Task<List<AuditLog>> GetByUserIdAsync(int userId) 
            => _auditLogRepository.GetByUserIdAsync(userId);

        public Task<List<AuditLog>> GetByDateRangeAsync(DateTime start, DateTime end) 
            => _auditLogRepository.GetByDateRangeAsync(start, end);

        public Task<List<AuditLog>> GetPagedAsync(int page, int pageSize) 
            => _auditLogRepository.GetPagedAsync(page, pageSize);
    }
}