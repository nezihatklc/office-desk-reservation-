using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly AppDbContext _context;

        public AuditLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<AuditLog>> GetAllAsync()
        {
            return await _context.AuditLogs.ToListAsync();
        }

        public async Task<AuditLog?> GetByIdAsync(int id)
        {
            return await _context.AuditLogs.FirstOrDefaultAsync(l => l.LogId == id);
        }

        public async Task AddAsync(AuditLog log)
        {
            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }

        //filter by user
        public async Task<List<AuditLog>> GetByUserIdAsync(int userId)
        {
            return await _context.AuditLogs
                .Where(l => l.UserId == userId)
                .OrderByDescending(l => l.LogTime)
                .ToListAsync();
        }

        //filter log by date 
        public async Task<List<AuditLog>> GetByDateRangeAsync(DateTime start, DateTime end)
        {
            return await _context.AuditLogs
                .Where(l => l.LogTime >= start && l.LogTime <= end)
                .OrderByDescending(l => l.LogTime)
                .ToListAsync();
        }

        //page log
        public async Task<List<AuditLog>> GetPagedAsync(int page, int pageSize)
        {
            return await _context.AuditLogs
                .OrderByDescending(l => l.LogTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
    }
}