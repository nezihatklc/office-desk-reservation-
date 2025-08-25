using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FacilitiesController : ControllerBase
    {
        private readonly FacilityService _facilityService;

        public FacilitiesController(FacilityService facilityService)
        {
            _facilityService = facilityService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _facilityService.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var facility = await _facilityService.GetByIdAsync(id);
            return facility == null ? NotFound() : Ok(facility);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Facility facility)
        {
            await _facilityService.AddAsync(facility);
            return CreatedAtAction(nameof(GetById), new { id = facility.FacilityId }, facility);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Facility facility)
        {
            if (id != facility.FacilityId) return BadRequest();
            await _facilityService.UpdateAsync(facility);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _facilityService.DeleteAsync(id);
            return NoContent();
        }
    }
}