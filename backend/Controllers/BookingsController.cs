using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Exceptions;
using Microsoft.AspNetCore.Http;

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
        [ProducesResponseType(typeof(IEnumerable<BookingResponse>), 200)]
        public async Task<IActionResult> GetAll()
        {
            var bookings = await _bookingService.GetAllAsync();
            var response = bookings.Select(ToResponse);
            return Ok(response);
        }

        // === GET MY BOOKINGS ===
        [HttpGet("my/{userId}")]
        [ProducesResponseType(typeof(IEnumerable<BookingResponse>), 200)]
        public async Task<IActionResult> GetMyBookings(int userId)
        {
            var bookings = await _bookingService.GetByUserIdAsync(userId);
            var response = bookings.Select(ToResponse);
            return Ok(response);
        }

        // === GET BOOKINGS BY OTHERS ===
        [HttpGet("others/{userId}")]
        [ProducesResponseType(typeof(IEnumerable<BookingResponse>), 200)]
        public async Task<IActionResult> GetOthersBookings(int userId)
        {
            var bookings = await _bookingService.GetByOthersAsync(userId);
            var response = bookings.Select(ToResponse);
            return Ok(response);
        }

        // === GET UPCOMING BOOKINGS ===
        [HttpGet("upcoming")]
        [ProducesResponseType(typeof(IEnumerable<BookingResponse>), 200)]
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
        [ProducesResponseType(typeof(IEnumerable<AuditLogResponse>), 200)]
        public async Task<IActionResult> GetPastBookings()
        {
            var logs = await _auditLogService.GetAllAsync();

            var pastLogs = logs
                .Where(l => l.Action.Contains("Booking"))
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
        [ProducesResponseType(typeof(BookingResponse), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(int id)
        {
            var booking = await _bookingService.GetByIdAsync(id);
            if (booking == null) return NotFound();

            return Ok(ToResponse(booking));
        }

        // === CREATE BOOKING ===
                [HttpPost]
                [ProducesResponseType(typeof(BookingResponse), 201)]
                [ProducesResponseType(400)]
                public async Task<IActionResult> Create([FromBody] BookingCreateRequest request)
                {
                    if (!ModelState.IsValid) return BadRequest(ModelState);

            var booking = new Booking
            {
                UserId = request.UserId,
                DeskId = request.DeskId,
                BookingDate = request.BookingDate.UtcDateTime,
                BookingStart = request.BookingStart.UtcDateTime,
                BookingEnd = request.BookingEnd.UtcDateTime,
                Status = request.Status ?? "Pending",
                Created = DateTime.UtcNow
            };

            await _bookingService.AddAsync(booking, request.UserId);  // ✅ pass userId
                    var created = await _bookingService.GetByIdAsync(booking.BookingId);
            await _auditLogService.AddAsync(new AuditLog 
            { 
                UserId = request.UserId, 
                Action = "Created Booking", 
                LogTime = DateTime.UtcNow 
            });

            return CreatedAtAction(nameof(GetById), new { id = booking.BookingId }, ToResponse(created ?? booking));
        }

        // === UPDATE BOOKING ===
        
            [HttpPut("{id}")]
            [ProducesResponseType(204)]
            [ProducesResponseType(404)]
            public async Task<IActionResult> Update(int id, [FromBody] BookingUpdateRequest request)
            {
                if (!ModelState.IsValid) return BadRequest(ModelState);

                var booking = await _bookingService.GetByIdAsync(id);
                if (booking == null) return NotFound();

                booking.DeskId = request.DeskId;
                booking.BookingDate = request.BookingDate.UtcDateTime;
                booking.BookingStart = request.BookingStart.UtcDateTime;
                booking.BookingEnd = request.BookingEnd.UtcDateTime;
                booking.Status = request.Status;

                await _bookingService.UpdateAsync(booking, booking.UserId);  // ✅ use booking.UserId

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
            [ProducesResponseType(204)]
            [ProducesResponseType(404)]
            public async Task<IActionResult> Delete(int id)
            {
                var booking = await _bookingService.GetByIdAsync(id);
                if (booking == null) return NotFound();

                await _bookingService.DeleteAsync(booking.BookingId, booking.UserId);  // ✅ pass userId
                await _auditLogService.AddAsync(new AuditLog 
                { 
                    UserId = booking.UserId, 
                    Action = "Deleted Booking", 
                    LogTime = DateTime.UtcNow 
                });

                return NoContent();
            }

        // === CHECK IN BOOKING ===
        [HttpPost("{id}/checkin")]
        [ProducesResponseType(typeof(BookingResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Checkin(int id, [FromBody] BookingCheckinRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var booking = await _bookingService.CheckInAsync(id, request.PerformedByUserId);
                return Ok(ToResponse(booking));
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // === CHECK OUT BOOKING ===
        [HttpPost("{id}/checkout")]
        [ProducesResponseType(typeof(BookingResponse), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Checkout(int id, [FromBody] BookingCheckoutRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var booking = await _bookingService.CheckoutAsync(id, request.PerformedByUserId);
                return Ok(ToResponse(booking));
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }
        // === HELPER METHOD ===
        private static BookingResponse ToResponse(Booking b) =>
            new BookingResponse
            {
                BookingId = b.BookingId,
                UserId = b.UserId,
                DeskId = b.DeskId,
                DeskCode = b.Desk?.DeskCode,
                BookingDate = b.BookingDate,
                BookingStart = b.BookingStart,
                BookingEnd = b.BookingEnd,
                Status = b.Status,
                Created = b.Created,
                User = b.User == null ? null : new BookingUserResponse
                {
                    UserId = b.User.UserId,
                    FirstName = b.User.FirstName,
                    LastName = b.User.LastName,
                    Email = b.User.Email,
                    EmailConfirmed = b.User.ConfirmedEmail
                }
            };
    }
}
