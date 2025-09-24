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
        private readonly FacilityService _facilityService;

        public DesksController(DeskService deskService, FacilityService facilityService)
        {
            _deskService = deskService;
            _facilityService = facilityService;
        }

        // GET: api/Desks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DeskResponse>>> GetAll()
        {
            var desks = await _deskService.GetAllAsync();
            var facilityLookup = await BuildFacilityLookupAsync();

            return Ok(desks.Select(d => MapDeskResponse(d, facilityLookup)));
        }

        // GET: api/Desks/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<DeskResponse>> GetById(int id)
        {
            var desk = await _deskService.GetByIdAsync(id);
            if (desk == null)
                throw new NotFoundException($"Desk with ID {id} not found.");

            var facilityLookup = await BuildFacilityLookupAsync();

            return Ok(MapDeskResponse(desk, facilityLookup));
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

    private async Task<Dictionary<string, List<string>>> BuildFacilityLookupAsync()
        {
            var facilities = await _facilityService.GetAllAsync();

            var lookup = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            foreach (var facility in facilities)
            {
                if (string.IsNullOrWhiteSpace(facility.Name))
                    continue;

                var key = NormalizeKey(facility.Name);
                if (string.IsNullOrEmpty(key))
                    continue;

                var label = string.IsNullOrWhiteSpace(facility.Description)
                    ? facility.Name
                    : $"{facility.Name}: {facility.Description}";

                if (!lookup.TryGetValue(key, out var list))
                {
                    list = new List<string>();
                    lookup[key] = list;
                }

                if (!string.IsNullOrWhiteSpace(label))
                    list.Add(label);
            }

            return lookup;
        }

        private static DeskResponse MapDeskResponse(Desk desk, Dictionary<string, List<string>> facilityLookup)
        {
            var facilities = desk.DeskFacilities
                .Select(df => string.IsNullOrWhiteSpace(df.Facility.Description)
                    ? df.Facility.Name
                    : $"{df.Facility.Name}: {df.Facility.Description}")
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            if (facilities.Count == 0)
            {
                var key = NormalizeKey(desk.DeskCode, desk.Workspace?.WorkspaceName);
                if (!string.IsNullOrEmpty(key) && facilityLookup.TryGetValue(key, out var byName))
                {
                    facilities = new List<string>(byName);
                }
            }

            return new DeskResponse
            {
                DeskId = desk.DeskId,
                WorkspaceId = desk.WorkspaceId,
                DeskCode = desk.DeskCode,
                IsActive = desk.IsActive,
                Facilities = facilities,
                WorkspaceName = desk.Workspace?.WorkspaceName,
                FocusMode = desk.Workspace?.FocusMode,
                NoiseLevel = desk.Workspace?.NoiseLevel
            };
        }

        private static string NormalizeKey(string? deskCode, string? workspaceName = null)
        {
            string? code = deskCode;
            if (string.IsNullOrWhiteSpace(code) && !string.IsNullOrWhiteSpace(workspaceName))
            {
                code = workspaceName;
            }

            if (string.IsNullOrWhiteSpace(code))
                return string.Empty;

            var trimmed = code.Trim();
            var firstToken = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? trimmed;
            var match = System.Text.RegularExpressions.Regex.Match(firstToken, "^([A-Za-z]+)[^0-9A-Za-z]*?(\\d+)$");

            if (match.Success)
            {
                var prefix = match.Groups[1].Value.ToUpperInvariant();
                var number = int.Parse(match.Groups[2].Value);
                return $"{prefix}{number}";
            }

            var normalized = new string(firstToken.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
            return normalized;
        }
    }
}
