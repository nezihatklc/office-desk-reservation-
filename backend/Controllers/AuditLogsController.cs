using backend.Models;
using backend.Services;
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

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _auditLogService.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var log = await _auditLogService.GetByIdAsync(id);
            return log == null ? NotFound() : Ok(log);
        }

        [HttpPost]
        public async Task<IActionResult> Create(AuditLog log)
        {
            await _auditLogService.AddAsync(log);
            return CreatedAtAction(nameof(GetById), new { id = log.LogId }, log);
        }
    }
}