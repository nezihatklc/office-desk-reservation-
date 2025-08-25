using backend.Models;
using backend.Repositories;

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
        public Task AddAsync(AuditLog log) => _auditLogRepository.AddAsync(log);
    }
}