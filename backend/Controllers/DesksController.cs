using backend.Models;
using backend.Services;
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

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _deskService.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var desk = await _deskService.GetByIdAsync(id);
            return desk == null ? NotFound() : Ok(desk);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Desk desk)
        {
            await _deskService.AddAsync(desk);
            return CreatedAtAction(nameof(GetById), new { id = desk.DeskId }, desk);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Desk desk)
        {
            if (id != desk.DeskId) return BadRequest();
            await _deskService.UpdateAsync(desk);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _deskService.DeleteAsync(id);
            return NoContent();
        }
    }
}