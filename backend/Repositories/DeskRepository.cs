using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class DeskRepository : IDeskRepository
    {
        private readonly AppDbContext _context;

        public DeskRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Desk>> GetAllAsync() =>
            await _context.Desks
                .Include(d => d.DeskFacilities)
                .ThenInclude(df => df.Facility)
                .ToListAsync();

        public async Task<Desk?> GetByIdAsync(int id) =>
            await _context.Desks
                .Include(d => d.DeskFacilities)
                .ThenInclude(df => df.Facility)
                .FirstOrDefaultAsync(d => d.DeskId == id);

        public async Task AddAsync(Desk desk)
        {
            _context.Desks.Add(desk);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Desk desk)
        {
            _context.Desks.Update(desk);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var desk = await _context.Desks.FindAsync(id);
            if (desk != null)
            {
                _context.Desks.Remove(desk);
                await _context.SaveChangesAsync();
            }
        }
    }
}