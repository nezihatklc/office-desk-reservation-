using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class FacilityRepository : IFacilityRepository
    {
        private readonly AppDbContext _context;

        public FacilityRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Facility>> GetAllAsync() =>
            await _context.Facilities.ToListAsync();

        public async Task<Facility?> GetByIdAsync(int id) =>
            await _context.Facilities.FindAsync(id);

        public async Task AddAsync(Facility facility)
        {
            _context.Facilities.Add(facility);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Facility facility)
        {
            _context.Facilities.Update(facility);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var facility = await _context.Facilities.FindAsync(id);
            if (facility != null)
            {
                _context.Facilities.Remove(facility);
                await _context.SaveChangesAsync();
            }
        }
    }
}