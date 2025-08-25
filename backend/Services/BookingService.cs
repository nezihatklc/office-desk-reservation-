using backend.Models;
using backend.Repositories;

namespace backend.Services
{
    public class BookingService
    {
        private readonly IBookingRepository _bookingRepository;

        public BookingService(IBookingRepository bookingRepository)
        {
            _bookingRepository = bookingRepository;
        }

        public Task<List<Booking>> GetAllAsync() => _bookingRepository.GetAllAsync();
        public Task<Booking?> GetByIdAsync(int id) => _bookingRepository.GetByIdAsync(id);
        public Task AddAsync(Booking booking) => _bookingRepository.AddAsync(booking);
        public Task UpdateAsync(Booking booking) => _bookingRepository.UpdateAsync(booking);
        public Task DeleteAsync(int id) => _bookingRepository.DeleteAsync(id);
    }
}