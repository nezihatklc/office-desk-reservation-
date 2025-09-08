using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using backend.Models;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly BookingService _bookingService;
        private readonly AuditLogService _auditLogService;

        public BookingsController(BookingService bookingService, AuditLogService auditLogService)
        {
            _bookingService = bookingService;
            _auditLogService = auditLogService;
        }

        // === GET ALL BOOKINGS ===
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var bookings = await _bookingService.GetAllAsync();

            var response = bookings.Select(ToResponse);
            return Ok(response);
        }

        // === GET MY BOOKINGS ===
        [HttpGet("my/{userId}")]
        public async Task<IActionResult> GetMyBookings(int userId)
        {
            var bookings = await _bookingService.GetByUserIdAsync(userId);
            var response = bookings.Select(ToResponse);
            return Ok(response);
        }

        // === GET BOOKINGS BY OTHERS ===
        [HttpGet("others/{userId}")]
        public async Task<IActionResult> GetOthersBookings(int userId)
        {
            var bookings = await _bookingService.GetByOthersAsync(userId);
            var response = bookings.Select(ToResponse);
            return Ok(response);
        }

        // === GET UPCOMING BOOKINGS ===
        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcoming()
        {
            var now = DateTime.UtcNow;
            var bookings = await _bookingService.GetAllAsync();

            var upcoming = bookings
                .Where(b => b.BookingDate.Date > now.Date ||
                           (b.BookingDate.Date == now.Date && b.BookingEnd > now))
                .OrderBy(b => b.BookingDate)
                .Select(ToResponse);

            return Ok(upcoming);
        }

        // === GET PAST BOOKINGS (from AuditLogs) ===
        [HttpGet("past")]
        public async Task<IActionResult> GetPastBookings()
        {
            var logs = await _auditLogService.GetAllAsync();

            var pastLogs = logs
                .Where(l => l.Action.Contains("Booking"))   // only booking-related logs
                .OrderByDescending(l => l.LogTime)
                .Select(l => new AuditLogResponse
                {
                    LogId = l.LogId,
                    UserId = l.UserId,
                    Action = l.Action,
                    LogTime = l.LogTime
                });

            return Ok(pastLogs);
        }

        // === GET BY ID ===
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var booking = await _bookingService.GetByIdAsync(id);
            if (booking == null) return NotFound();

            return Ok(ToResponse(booking));
        }

        // === CREATE BOOKING ===
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BookingCreateRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var booking = new Booking
            {
                UserId = request.UserId,
                DeskId = request.DeskId,
                BookingDate = request.BookingDate,
                BookingStart = request.BookingStart,
                BookingEnd = request.BookingEnd,
                Status = request.Status ?? "Pending",
                Created = DateTime.UtcNow
            };

            await _bookingService.AddAsync(booking);
            await _auditLogService.AddAsync(new AuditLog 
            { 
                UserId = request.UserId, 
                Action = "Created Booking", 
                LogTime = DateTime.UtcNow 
            });

            return CreatedAtAction(nameof(GetById), new { id = booking.BookingId }, ToResponse(booking));
        }

        // === UPDATE BOOKING ===
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] BookingUpdateRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var booking = await _bookingService.GetByIdAsync(id);
            if (booking == null) return NotFound();

            booking.DeskId = request.DeskId;
            booking.BookingDate = request.BookingDate;
            booking.BookingStart = request.BookingStart;
            booking.BookingEnd = request.BookingEnd;
            booking.Status = request.Status;

            await _bookingService.UpdateAsync(booking);
            await _auditLogService.AddAsync(new AuditLog 
            { 
                UserId = booking.UserId, 
                Action = "Updated Booking", 
                LogTime = DateTime.UtcNow 
            });

            return NoContent();
        }

        // === DELETE BOOKING ===
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var booking = await _bookingService.GetByIdAsync(id);
            if (booking == null) return NotFound();

            await _bookingService.DeleteAsync(booking.BookingId);
            await _auditLogService.AddAsync(new AuditLog 
            { 
                UserId = booking.UserId, 
                Action = "Deleted Booking", 
                LogTime = DateTime.UtcNow 
            });

            return NoContent();
        }

        // === HELPER METHOD ===
        private static BookingResponse ToResponse(Booking b) =>
            new BookingResponse
            {
                BookingId = b.BookingId,
                UserId = b.UserId,
                DeskId = b.DeskId,
                BookingDate = b.BookingDate,
                BookingStart = b.BookingStart,
                BookingEnd = b.BookingEnd,
                Status = b.Status,
                Created = b.Created
            };
    }
}
