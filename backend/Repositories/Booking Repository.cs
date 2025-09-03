using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;



namespace backend.Repositories
{
    public class BookingRepository : IBookingRepository
    {
        private readonly AppDbContext _context;

        public BookingRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Booking>> GetAllAsync() =>
            await _context.Bookings.ToListAsync();

        public async Task<Booking?> GetByIdAsync(int id) =>
            await _context.Bookings.FindAsync(id);

        public async Task AddAsync(Booking booking)
        {
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Booking booking)
        {
            _context.Bookings.Update(booking);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking != null)
            {
                _context.Bookings.Remove(booking);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<Booking>> GetByUserIdAsync(int userId) =>
            await _context.Bookings.Where(b => b.UserId == userId).ToListAsync();

        public async Task<List<Booking>> GetByDeskIdAsync(int deskId) =>
            await _context.Bookings.Where(b => b.DeskId == deskId).ToListAsync();

        public async Task<bool> HasOverlapAsync(int deskId, DateTime start, DateTime end)
        {
            return await _context.Bookings.AnyAsync(b =>
                b.DeskId == deskId &&
                ((start >= b.BookingStart && start < b.BookingEnd) ||
                 (end > b.BookingStart && end <= b.BookingEnd) ||
                 (start <= b.BookingStart && end >= b.BookingEnd))
            );
        }
    }
}