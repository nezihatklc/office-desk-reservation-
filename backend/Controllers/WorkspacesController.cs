using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkspacesController : ControllerBase
    {
        private readonly WorkspaceService _workspaceService;

        public WorkspacesController(WorkspaceService workspaceService)
        {
            _workspaceService = workspaceService;
        }

        // GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var workspaces = await _workspaceService.GetAllAsync();

            var result = workspaces.Select(w => new WorkspaceResponseDto
            {
                WorkspaceId = w.WorkspaceId,
                WorkspaceName = w.WorkspaceName,
                FloorNumber = w.FloorNumber,
                DeskCode = w.DeskCode,
                Capacity=w.Capacity,
                Created = w.Created
            });

            return Ok(result);
        }

        // GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var workspace = await _workspaceService.GetByIdAsync(id);
            if (workspace == null) return NotFound();

            return Ok(new WorkspaceResponseDto
            {
                WorkspaceId = workspace.WorkspaceId,
                WorkspaceName = workspace.WorkspaceName,
                FloorNumber = workspace.FloorNumber,
                DeskCode = workspace.DeskCode,
                Capacity=workspace.Capacity,
                Created = workspace.Created
            });
        }

        // CREATE
        [HttpPost]
        public async Task<IActionResult> Create(WorkspaceCreateDto dto)
        {
            try
            {
                var workspace = new Workspace
                {
                    WorkspaceName = dto.WorkspaceName,
                    FloorNumber = dto.FloorNumber,
                    DeskCode = dto.DeskCode,
                    Capacity=dto.Capacity,
                    Created = DateTime.UtcNow
                };

                await _workspaceService.AddAsync(workspace);

                return CreatedAtAction(nameof(GetById), new { id = workspace.WorkspaceId }, new WorkspaceResponseDto
                {
                    WorkspaceId = workspace.WorkspaceId,
                    WorkspaceName = workspace.WorkspaceName,
                    FloorNumber = workspace.FloorNumber,
                    DeskCode = workspace.DeskCode,
                    Capacity=workspace.Capacity,
                    Created = workspace.Created
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    nner = ex.InnerException?.Message
                });
            }
        } 
        
    }
}