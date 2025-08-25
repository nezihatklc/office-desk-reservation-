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

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _workspaceService.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var workspace = await _workspaceService.GetByIdAsync(id);
            return workspace == null ? NotFound() : Ok(workspace);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Workspace workspace)
        {
            await _workspaceService.AddAsync(workspace);
            return CreatedAtAction(nameof(GetById), new { id = workspace.WorkspaceId }, workspace);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Workspace workspace)
        {
            if (id != workspace.WorkspaceId) return BadRequest();
            await _workspaceService.UpdateAsync(workspace);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _workspaceService.DeleteAsync(id);
            return NoContent();
        }
    }
}