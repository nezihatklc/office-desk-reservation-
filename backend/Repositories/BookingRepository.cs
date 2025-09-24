using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;



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
            await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Desk)
                .ToListAsync();

        public async Task<Booking?> GetByIdAsync(int id) =>
            await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Desk)
                .FirstOrDefaultAsync(b => b.BookingId == id);

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
            await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Desk)
                .Where(b => b.UserId == userId)
                .ToListAsync();

        public async Task<List<Booking>> GetByDeskIdAsync(int deskId) =>
            await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Desk)
                .Where(b => b.DeskId == deskId)
                .ToListAsync();

        public async Task<bool> HasOverlapAsync(int deskId, DateTime start, DateTime end)
        {
            return await _context.Bookings.AnyAsync(b =>
                b.DeskId == deskId &&
                ((start >= b.BookingStart && start < b.BookingEnd) ||
                 (end > b.BookingStart && end <= b.BookingEnd) ||
                 (start <= b.BookingStart && end >= b.BookingEnd))
            );
        }

        public async Task<bool> UserHasOverlapAsync(int userId, DateTime start, DateTime end)
        {
            return await _context.Bookings.AnyAsync(b =>
                b.UserId == userId &&
                ((start >= b.BookingStart && start < b.BookingEnd) ||
                 (end > b.BookingStart && end <= b.BookingEnd) ||
                 (start <= b.BookingStart && end >= b.BookingEnd))
            );
        }

        public async Task SetStatusAsync(Booking booking, string status, CancellationToken cancellationToken = default)
        {
            var entry = _context.Entry(booking);

            if (entry.State == EntityState.Detached)
            {
                _context.Bookings.Attach(booking);
                entry = _context.Entry(booking);
            }

            booking.Status = status;
            entry.State = EntityState.Unchanged;
            entry.Property(b => b.Status).IsModified = true;

            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
