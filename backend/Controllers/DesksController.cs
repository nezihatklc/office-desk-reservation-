using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DesksController : ControllerBase
    {
        private readonly DeskService _deskService;

        public DesksController(DeskService deskService)
        {
            _deskService = deskService;
        }

        // GET: api/Desks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DeskResponse>>> GetAll()
        {
            var desks = await _deskService.GetAllAsync();

            return Ok(desks.Select(d => new DeskResponse
            {
                DeskId = d.DeskId,
                WorkspaceId = d.WorkspaceId,
                DeskCode = d.DeskCode,
                IsActive = d.IsActive,
                Facilities = d.DeskFacilities
                    .Select(df => df.Facility.Name)
                    .ToList()
            }));
        }

        // GET: api/Desks/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<DeskResponse>> GetById(int id)
        {
            var desk = await _deskService.GetByIdAsync(id);
            if (desk == null)
                throw new NotFoundException($"Desk with ID {id} not found.");

            return Ok(new DeskResponse
            {
                DeskId = desk.DeskId,
                WorkspaceId = desk.WorkspaceId,
                DeskCode = desk.DeskCode,
                IsActive = desk.IsActive,
                Facilities = desk.DeskFacilities
                    .Select(df => df.Facility.Name)
                    .ToList()
            });
        }

        // POST: api/Desks
        [HttpPost]
        public async Task<ActionResult<DeskResponse>> Create([FromBody] DeskCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.DeskCode))
                throw new BadRequestException("DeskCode is required.");

            var desk = new Desk
            {
                WorkspaceId = request.WorkspaceId,
                DeskCode = request.DeskCode,
                IsActive = request.IsActive,
                Created = DateTime.UtcNow,
                CreatedBy = null
            };

            await _deskService.AddAsync(desk);

            return CreatedAtAction(nameof(GetById), new { id = desk.DeskId }, new DeskResponse
            {
                DeskId = desk.DeskId,
                WorkspaceId = desk.WorkspaceId,
                DeskCode = desk.DeskCode,
                IsActive = desk.IsActive,
                Facilities = new List<string>() // new desk has no facilities yet
            });
        }

        // PUT: api/Desks/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] DeskUpdateRequest request)
        {
            if (id != request.DeskId)
                throw new BadRequestException("ID in URL and body do not match.");

            var desk = await _deskService.GetByIdAsync(id);
            if (desk == null)
                throw new NotFoundException($"Desk with ID {id} not found.");

            desk.DeskCode = request.DeskCode;
            desk.IsActive = request.IsActive;

            await _deskService.UpdateAsync(desk);
            return NoContent();
        }

        // DELETE: api/Desks/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var desk = await _deskService.GetByIdAsync(id);
            if (desk == null)
                throw new NotFoundException($"Desk with ID {id} not found.");

            await _deskService.DeleteAsync(id);
            return NoContent();
        }
    }
}
