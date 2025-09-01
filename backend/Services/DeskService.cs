using backend.Models;
using backend.Repositories;

namespace backend.Services
{
    public class DeskService
    {
        private readonly IDeskRepository _deskRepository;

        public DeskService(IDeskRepository deskRepository)
        {
            _deskRepository = deskRepository;
        }

        public Task<List<Desk>> GetAllAsync() => _deskRepository.GetAllAsync();
        public Task<Desk?> GetByIdAsync(int id) => _deskRepository.GetByIdAsync(id);
        public Task AddAsync(Desk desk) => _deskRepository.AddAsync(desk);
        public Task UpdateAsync(Desk desk) => _deskRepository.UpdateAsync(desk);
        public Task DeleteAsync(int id) => _deskRepository.DeleteAsync(id);
    }
}