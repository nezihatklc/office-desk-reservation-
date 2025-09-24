using backend.DTOs;
using backend.Exceptions;
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
                Capacity = w.Capacity,
                TeamName = w.TeamName,
                Created = w.Created
            });

            return Ok(result);
        }

        // GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var workspace = await _workspaceService.GetByIdAsync(id);

                return Ok(new WorkspaceResponseDto
                {
                    WorkspaceId = workspace.WorkspaceId,
                    WorkspaceName = workspace.WorkspaceName,
                    FloorNumber = workspace.FloorNumber,
                    DeskCode = workspace.DeskCode,
                    Capacity = workspace.Capacity,
                    TeamName = workspace.TeamName,
                    Created = workspace.Created
                });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
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
                    Capacity = dto.Capacity,
                    TeamName = NormalizeTeam(dto.TeamName),
                    Created = DateTime.UtcNow
                };

                await _workspaceService.AddAsync(workspace);

                return CreatedAtAction(nameof(GetById), new { id = workspace.WorkspaceId }, new WorkspaceResponseDto
                {
                    WorkspaceId = workspace.WorkspaceId,
                    WorkspaceName = workspace.WorkspaceName,
                    FloorNumber = workspace.FloorNumber,
                    DeskCode = workspace.DeskCode,
                    Capacity = workspace.Capacity,
                    TeamName = workspace.TeamName,
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

        // UPDATE
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] WorkspaceUpdateDto dto)
        {
            try
            {
                var workspace = await _workspaceService.GetByIdAsync(id);

                if (!string.IsNullOrWhiteSpace(dto.WorkspaceName))
                    workspace.WorkspaceName = dto.WorkspaceName.Trim();

                if (!string.IsNullOrWhiteSpace(dto.FloorNumber))
                    workspace.FloorNumber = dto.FloorNumber.Trim();

                if (!string.IsNullOrWhiteSpace(dto.DeskCode))
                    workspace.DeskCode = dto.DeskCode.Trim();

                if (dto.Capacity is int capacity && capacity >= 0)
                    workspace.Capacity = capacity;

                if (dto.TeamName != null)
                    workspace.TeamName = NormalizeTeam(dto.TeamName);

                await _workspaceService.UpdateAsync(workspace);

                return Ok(new WorkspaceResponseDto
                {
                    WorkspaceId = workspace.WorkspaceId,
                    WorkspaceName = workspace.WorkspaceName,
                    FloorNumber = workspace.FloorNumber,
                    DeskCode = workspace.DeskCode,
                    Capacity = workspace.Capacity,
                    TeamName = workspace.TeamName,
                    Created = workspace.Created
                });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        private static string? NormalizeTeam(string? teamName)
        {
            if (string.IsNullOrWhiteSpace(teamName))
                return null;

            var trimmed = teamName.Trim();
            return trimmed.Length == 0 ? null : trimmed;
        }

    }
}
