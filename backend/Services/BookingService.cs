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

        public BookingService(
            IBookingRepository bookingRepository,
            IDeskRepository deskRepository,
            IUserRepository userRepository)
        {
            _bookingRepository = bookingRepository;
            _deskRepository = deskRepository;
            _userRepository = userRepository;
        }

        public Task<List<Booking>> GetAllAsync() => _bookingRepository.GetAllAsync();
        public Task<Booking?> GetByIdAsync(int id) => _bookingRepository.GetByIdAsync(id);

        public async Task AddAsync(Booking booking)
        {
            // Validate Desk
            var desk = await _deskRepository.GetByIdAsync(booking.DeskId);
            if (desk == null)
                throw new NotFoundException($"Desk {booking.DeskId} not found.");

            // Validate User
            var user = await _userRepository.GetByIdAsync(booking.UserId);
            if (user == null)
                throw new NotFoundException($"User {booking.UserId} not found.");

            // Validate Overlap
            var hasOverlap = await _bookingRepository.HasOverlapAsync(
                booking.DeskId, booking.BookingStart, booking.BookingEnd);

            if (hasOverlap)
                throw new ConflictException("Desk is already booked for the selected time range.");

            await _bookingRepository.AddAsync(booking);
        }

        public async Task UpdateAsync(Booking booking)
        {
            var existing = await _bookingRepository.GetByIdAsync(booking.BookingId);
            if (existing == null)
                throw new NotFoundException($"Booking {booking.BookingId} not found.");

            await _bookingRepository.UpdateAsync(booking);
        }

        public async Task DeleteAsync(int id)
        {
            var existing = await _bookingRepository.GetByIdAsync(id);
            if (existing == null)
                throw new NotFoundException($"Booking {id} not found.");

            await _bookingRepository.DeleteAsync(id);
        }

        public Task<List<Booking>> GetByUserIdAsync(int userId) =>
            _bookingRepository.GetByUserIdAsync(userId);

        public Task<List<Booking>> GetByDeskIdAsync(int deskId) =>
            _bookingRepository.GetByDeskIdAsync(deskId);
    }
}
