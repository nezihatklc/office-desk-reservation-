using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuditLogsController : ControllerBase
    {
        private readonly AuditLogService _auditLogService;

        public AuditLogsController(AuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        // GET: api/AuditLogs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AuditLogResponse>>> GetAll()
        {
            var logs = await _auditLogService.GetAllAsync();
            return Ok(logs.Select(l => new AuditLogResponse
            {
                LogId = l.LogId,
                UserId = l.UserId,
                Action = l.Action,
                LogTime = l.LogTime
            }));
        }

        // GET: api/AuditLogs/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<AuditLogResponse>> GetById(int id)
        {
            var log = await _auditLogService.GetByIdAsync(id);
            if (log == null)
                throw new NotFoundException($"Audit log with ID {id} not found.");

            return Ok(new AuditLogResponse
            {
                LogId = log.LogId,
                UserId = log.UserId,
                Action = log.Action,
                LogTime = log.LogTime
            });
        }
        

        // GET: api/AuditLogs/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<AuditLogResponse>>> GetByUserId(int userId)
        {
            var logs = await _auditLogService.GetByUserIdAsync(userId);
            return Ok(logs.Select(l => new AuditLogResponse
            {
                LogId = l.LogId,
                UserId = l.UserId,
                Action = l.Action,
                LogTime = l.LogTime
            }));
        }

        // GET: api/AuditLogs/date?start=2025-01-01&end=2025-01-31
        [HttpGet("date")]
        public async Task<ActionResult<IEnumerable<AuditLogResponse>>> GetByDateRange([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var logs = await _auditLogService.GetByDateRangeAsync(start, end);
            return Ok(logs.Select(l => new AuditLogResponse
            {
                LogId = l.LogId,
                UserId = l.UserId,
                Action = l.Action,
                LogTime = l.LogTime
            }));
        }

        // GET: api/AuditLogs/paged?page=1&pageSize=10
        [HttpGet("paged")]
        public async Task<ActionResult<IEnumerable<AuditLogResponse>>> GetPaged([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var logs = await _auditLogService.GetPagedAsync(page, pageSize);
            return Ok(logs.Select(l => new AuditLogResponse
            {
                LogId = l.LogId,
                UserId = l.UserId,
                Action = l.Action,
                LogTime = l.LogTime
            }));
        }
    }
}
