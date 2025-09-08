using backend.Models;
using backend.Repositories;
using backend.Exceptions;

namespace backend.Services
{
    public class BookingService
    {
        private readonly IBookingRepository _bookingRepository;
        private readonly IDeskRepository _deskRepository;
        private readonly IUserRepository _userRepository;
        private readonly AuditLogService _auditLogService;

        public BookingService(
            IBookingRepository bookingRepository,
            IDeskRepository deskRepository,
            IUserRepository userRepository,
            AuditLogService auditLogService)   //audit log service
        {
            _bookingRepository = bookingRepository;
            _deskRepository = deskRepository;
            _userRepository = userRepository;
            _auditLogService = auditLogService;
        }

        public Task<List<Booking>> GetAllAsync() => _bookingRepository.GetAllAsync();
        public Task<Booking?> GetByIdAsync(int id) => _bookingRepository.GetByIdAsync(id);

        public async Task AddAsync(Booking booking)
        {
            var desk = await _deskRepository.GetByIdAsync(booking.DeskId);
            if (desk == null)
                throw new NotFoundException($"Desk {booking.DeskId} not found.");

            var user = await _userRepository.GetByIdAsync(booking.UserId);
            if (user == null)
                throw new NotFoundException($"User {booking.UserId} not found.");

            if (await _bookingRepository.HasOverlapAsync(booking.DeskId, booking.BookingStart, booking.BookingEnd))
                throw new ConflictException("Desk is already booked for the selected time range.");

            await _bookingRepository.AddAsync(booking);

            // Audit log
            await _auditLogService.AddAsync(new AuditLog
            {
                UserId = booking.UserId,
                Action = $"Created booking {booking.BookingId} for Desk {booking.DeskId}",
                LogTime = DateTime.UtcNow
            });
        }

        public async Task UpdateAsync(Booking booking)
        {
            var existing = await _bookingRepository.GetByIdAsync(booking.BookingId);
            if (existing == null)
                throw new NotFoundException($"Booking {booking.BookingId} not found.");

            await _bookingRepository.UpdateAsync(booking);

            // Audit log
            await _auditLogService.AddAsync(new AuditLog
            {
                UserId = booking.UserId,
                Action = $"Updated booking {booking.BookingId} (Desk {booking.DeskId})",
                LogTime = DateTime.UtcNow
            });
        }

        public async Task DeleteAsync(int id)
        {
            var existing = await _bookingRepository.GetByIdAsync(id);
            if (existing == null)
                throw new NotFoundException($"Booking {id} not found.");

            await _bookingRepository.DeleteAsync(id);

            // Audit log
            await _auditLogService.AddAsync(new AuditLog
            {
                UserId = existing.UserId,
                Action = $"Deleted booking {existing.BookingId} (Desk {existing.DeskId})",
                LogTime = DateTime.UtcNow
            });
        }

        // Get only bookings for the given user
        public Task<List<Booking>> GetByUserIdAsync(int userId) =>
            _bookingRepository.GetByUserIdAsync(userId);

        // Get bookings by desk
        public Task<List<Booking>> GetByDeskIdAsync(int deskId) =>
            _bookingRepository.GetByDeskIdAsync(deskId);

        // 🔹 NEW: Get bookings made by others
        public async Task<List<Booking>> GetByOthersAsync(int userId)
        {
            var allBookings = await _bookingRepository.GetAllAsync();
            return allBookings.Where(b => b.UserId != userId).ToList();
        }
    }
}
