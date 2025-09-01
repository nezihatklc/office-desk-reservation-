using backend.Models;
using backend.Repositories;
using backend.Exceptions;

namespace backend.Services
{
    public class FacilityService
    {
        private readonly IFacilityRepository _facilityRepository;

        public FacilityService(IFacilityRepository facilityRepository)
        {
            _facilityRepository = facilityRepository;
        }

        public Task<List<Facility>> GetAllAsync() => _facilityRepository.GetAllAsync();
        public Task<Facility?> GetByIdAsync(int id) => _facilityRepository.GetByIdAsync(id);

        public async Task AddAsync(Facility facility)
        {
            await _facilityRepository.AddAsync(facility);
        }

        public async Task UpdateAsync(Facility facility)
        {
            var existing = await _facilityRepository.GetByIdAsync(facility.FacilityId);
            if (existing == null)
                throw new NotFoundException($"Facility with ID {facility.FacilityId} not found.");

            await _facilityRepository.UpdateAsync(facility);
        }

        public async Task DeleteAsync(int id)
        {
            var existing = await _facilityRepository.GetByIdAsync(id);
            if (existing == null)
                throw new NotFoundException($"Facility with ID {id} not found.");

            await _facilityRepository.DeleteAsync(id);
        }
    }
}