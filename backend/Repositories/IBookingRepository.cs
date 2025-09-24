using System;
using System.Collections.Generic;
using System.Threading;
using backend.Models;

namespace backend.Repositories
{
    public interface IBookingRepository
    {
        Task<List<Booking>> GetAllAsync();
        Task<Booking?> GetByIdAsync(int id);
        Task AddAsync(Booking booking);
        Task UpdateAsync(Booking booking);
        Task DeleteAsync(int id);

        //queries
        Task<List<Booking>> GetByUserIdAsync(int userId);
        Task<List<Booking>> GetByDeskIdAsync(int deskId);
        Task<bool> HasOverlapAsync(int deskId, DateTime start, DateTime end);
        Task<bool> UserHasOverlapAsync(int userId, DateTime start, DateTime end);

        Task SetStatusAsync(Booking booking, string status, CancellationToken cancellationToken = default);
    }
}
