using backend.Models;
using backend.Repositories;

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
        public Task AddAsync(Facility facility) => _facilityRepository.AddAsync(facility);
        public Task UpdateAsync(Facility facility) => _facilityRepository.UpdateAsync(facility);
        public Task DeleteAsync(int id) => _facilityRepository.DeleteAsync(id);
    }
}