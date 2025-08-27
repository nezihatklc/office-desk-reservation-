using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Exceptions;
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

        // GET: api/Facilities
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FacilityResponse>>> GetAll()
        {
            var facilities = await _facilityService.GetAllAsync();
            return Ok(facilities.Select(f => new FacilityResponse
            {
                FacilityId = f.FacilityId,
                Name = f.Name,
                Description = f.Description
            }));
        }

        // GET: api/Facilities/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<FacilityResponse>> GetById(int id)
        {
            var facility = await _facilityService.GetByIdAsync(id);
            if (facility == null)
                throw new NotFoundException($"Facility with ID {id} not found.");

            return Ok(new FacilityResponse
            {
                FacilityId = facility.FacilityId,
                Name = facility.Name,
                Description = facility.Description
            });
        }

        // POST: api/Facilities
        [HttpPost]
        public async Task<ActionResult<FacilityResponse>> Create([FromBody] FacilityCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new BadRequestException("Facility name is required.");

            var facility = new Facility
            {
                Name = request.Name,
                Description = request.Description
            };

            await _facilityService.AddAsync(facility);

            return CreatedAtAction(nameof(GetById), new { id = facility.FacilityId }, new FacilityResponse
            {
                FacilityId = facility.FacilityId,
                Name = facility.Name,
                Description = facility.Description
            });
        }

        // PUT: api/Facilities/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] FacilityUpdateRequest request)
        {
            if (id != request.FacilityId)
                throw new BadRequestException("ID in URL and body do not match.");

            var facility = new Facility
            {
                FacilityId = request.FacilityId,
                Name = request.Name,
                Description = request.Description
            };

            await _facilityService.UpdateAsync(facility);
            return NoContent();
        }

        // DELETE: api/Facilities/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            await _facilityService.DeleteAsync(id);
            return NoContent();
        }
    }
}
