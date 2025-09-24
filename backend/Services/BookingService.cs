using backend.Models;
using backend.Repositories;
using backend.Exceptions;
using System;
using System.Threading;

namespace backend.Services
{
    public class BookingService
    {
        private readonly IBookingRepository _bookingRepository;
        private readonly IDeskRepository _deskRepository;
        private readonly AuditLogService _auditLogService;
        private readonly IUserRepository _userRepository;

        public BookingService(
            IBookingRepository bookingRepository,
            IDeskRepository deskRepository,
            AuditLogService auditLogService,
            IUserRepository userRepository)
        {
            _bookingRepository = bookingRepository;
            _deskRepository = deskRepository;
            _auditLogService = auditLogService;
            _userRepository = userRepository;
        }

        public Task<List<Booking>> GetAllAsync() => _bookingRepository.GetAllAsync();
        public Task<Booking?> GetByIdAsync(int id) => _bookingRepository.GetByIdAsync(id);



        public async Task<List<int>> GetAvailableDesksAsync(DateTime date)
        {
            var allDesks = await _deskRepository.GetAllAsync();
            var bookings = await _bookingRepository.GetAllAsync();

            // filter out desks that are already booked for the given date
            var bookedDeskIds = bookings
                .Where(b => b.BookingDate.Date == date.Date)
                .Select(b => b.DeskId)
                .ToHashSet();

            return allDesks
                .Where(d => !bookedDeskIds.Contains(d.DeskId))
                .Select(d => d.DeskId)
                .ToList();
        }



        public async Task AddAsync(Booking booking, int currentUserId)
        {
            var desk = await _deskRepository.GetByIdAsync(booking.DeskId);
            if (desk == null)
                throw new NotFoundException($"Desk {booking.DeskId} not found.");

            booking.UserId = currentUserId;

            var bookingStartUtc = booking.BookingStart.Kind == DateTimeKind.Utc
                ? booking.BookingStart
                : DateTime.SpecifyKind(booking.BookingStart, DateTimeKind.Utc);
            var bookingEndUtc = booking.BookingEnd.Kind == DateTimeKind.Utc
                ? booking.BookingEnd
                : DateTime.SpecifyKind(booking.BookingEnd, DateTimeKind.Utc);

            if (bookingEndUtc <= bookingStartUtc)
                throw new BadRequestException("Booking end time must be after start time.");

            booking.BookingStart = bookingStartUtc;
            booking.BookingEnd = bookingEndUtc;
            booking.BookingDate = bookingStartUtc;
            booking.Created = DateTime.UtcNow;
            booking.Status = booking.Status ?? "Confirmed";

            if (await _bookingRepository.HasOverlapAsync(booking.DeskId, booking.BookingStart, booking.BookingEnd))
                throw new ConflictException("Desk is already booked for the selected time range.");

            if (await _bookingRepository.UserHasOverlapAsync(currentUserId, booking.BookingStart, booking.BookingEnd))
                throw new ConflictException("You already have a booking during this time.");

            await _bookingRepository.AddAsync(booking);

            await _auditLogService.AddAsync(new AuditLog
            {
                UserId = currentUserId,
                Action = $"Created booking {booking.BookingId} for Desk {booking.DeskId}",
                LogTime = DateTime.UtcNow
            });
        }

        public async Task UpdateAsync(Booking booking, int currentUserId)
        {
            var existing = await _bookingRepository.GetByIdAsync(booking.BookingId);
            if (existing == null)
                throw new NotFoundException($"Booking {booking.BookingId} not found.");

            // ✅ Ensure only the same user can update their booking
            if (existing.UserId != currentUserId)
                throw new UnauthorizedAccessException("You cannot update someone else's booking.");

            await _bookingRepository.UpdateAsync(booking);

            await _auditLogService.AddAsync(new AuditLog
            {
                UserId = currentUserId,
                Action = $"Updated booking {booking.BookingId} (Desk {booking.DeskId})",
                LogTime = DateTime.UtcNow
            });
        }

        public async Task DeleteAsync(int id, int currentUserId)
        {
            var existing = await _bookingRepository.GetByIdAsync(id);
            if (existing == null)
                throw new NotFoundException($"Booking {id} not found.");

            if (existing.UserId != currentUserId)
                throw new UnauthorizedAccessException("You cannot delete someone else's booking.");

            await _bookingRepository.DeleteAsync(id);

            await _auditLogService.AddAsync(new AuditLog
            {
                UserId = currentUserId,
                Action = $"Deleted booking {existing.BookingId} (Desk {existing.DeskId})",
                LogTime = DateTime.UtcNow
            });
        }

        public Task<List<Booking>> GetByUserIdAsync(int userId) =>
            _bookingRepository.GetByUserIdAsync(userId);

        public Task<List<Booking>> GetByDeskIdAsync(int deskId) =>
            _bookingRepository.GetByDeskIdAsync(deskId);

        public async Task<List<Booking>> GetByOthersAsync(int userId)
        {
            var allBookings = await _bookingRepository.GetAllAsync();
            return allBookings.Where(b => b.UserId != userId).ToList();
        }

        public async Task<Booking> CheckoutAsync(int bookingId, int performedByUserId, CancellationToken cancellationToken = default)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId)
                ?? throw new NotFoundException($"Booking {bookingId} not found.");

            if (booking.Status != null && string.Equals(booking.Status, "CheckedOut", StringComparison.OrdinalIgnoreCase))
            {
                return booking;
            }

            var isOwner = booking.UserId == performedByUserId;
            var actor = await _userRepository.GetByIdAsync(performedByUserId)
                ?? throw new NotFoundException($"User {performedByUserId} not found.");

            var isAdmin = !string.IsNullOrWhiteSpace(actor.Role) &&
                string.Equals(actor.Role, "Admin", StringComparison.OrdinalIgnoreCase);

            if (!isOwner && !isAdmin)
                throw new UnauthorizedAccessException("You are not allowed to check out this booking.");

            await _bookingRepository.SetStatusAsync(booking, "CheckedOut", cancellationToken);

            await _auditLogService.AddAsync(new AuditLog
            {
                UserId = performedByUserId,
                Action = $"Checked out booking {booking.BookingId} (Desk {booking.DeskId})",
                LogTime = DateTime.UtcNow
            });

            booking.Status = "CheckedOut";
            return booking;
        }
    }
}
