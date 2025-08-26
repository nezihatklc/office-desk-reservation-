using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly BookingService _bookingService;

        public BookingsController(BookingService bookingService)
        {
            _bookingService = bookingService;
        }

        // GET: api/Bookings
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookingResponse>>> GetAll()
        {
            var bookings = await _bookingService.GetAllAsync();
            return Ok(bookings.Select(b => new BookingResponse
            {
                BookingId = b.BookingId,
                UserId = b.UserId,
                DeskId = b.DeskId,
                BookingStart = b.BookingStart,
                BookingEnd = b.BookingEnd,
                Status = b.Status,
                Created = b.Created
            }));
        }

        // GET: api/Bookings/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<BookingResponse>> GetById(int id)
        {
            var booking = await _bookingService.GetByIdAsync(id);
            if (booking == null)
                throw new NotFoundException($"Booking with ID {id} not found.");

            return Ok(new BookingResponse
            {
                BookingId = booking.BookingId,
                UserId = booking.UserId,
                DeskId = booking.DeskId,
                BookingStart = booking.BookingStart,
                BookingEnd = booking.BookingEnd,
                Status = booking.Status,
                Created = booking.Created
            });
        }

        // GET: api/Bookings/byUser/{userId}
        [HttpGet("byUser/{userId}")]
        public async Task<ActionResult<IEnumerable<BookingResponse>>> GetByUser(int userId)
        {
            var bookings = await _bookingService.GetByUserIdAsync(userId);
            return Ok(bookings.Select(b => new BookingResponse
            {
                BookingId = b.BookingId,
                UserId = b.UserId,
                DeskId = b.DeskId,
                BookingStart = b.BookingStart,
                BookingEnd = b.BookingEnd,
                Status = b.Status,
                Created = b.Created
            }));
        }

        // GET: api/Bookings/byDesk/{deskId}
        [HttpGet("byDesk/{deskId}")]
        public async Task<ActionResult<IEnumerable<BookingResponse>>> GetByDesk(int deskId)
        {
            var bookings = await _bookingService.GetByDeskIdAsync(deskId);
            return Ok(bookings.Select(b => new BookingResponse
            {
                BookingId = b.BookingId,
                UserId = b.UserId,
                DeskId = b.DeskId,
                BookingStart = b.BookingStart,
                BookingEnd = b.BookingEnd,
                Status = b.Status,
                Created = b.Created
            }));
        }

        // POST: api/Bookings
        [HttpPost]
        public async Task<ActionResult<BookingResponse>> Create([FromBody] BookingCreateRequest request)
        {
            if (request.BookingEnd <= request.BookingStart)
                throw new BadRequestException("BookingEnd must be later than BookingStart.");

            var booking = new Booking
            {
                UserId = request.UserId,
                DeskId = request.DeskId,
                BookingStart = request.BookingStart,
                BookingEnd = request.BookingEnd,
                Status = request.Status ?? "Pending",
                Created = DateTime.UtcNow
            };

            await _bookingService.AddAsync(booking);

            return CreatedAtAction(nameof(GetById), new { id = booking.BookingId }, new BookingResponse
            {
                BookingId = booking.BookingId,
                UserId = booking.UserId,
                DeskId = booking.DeskId,
                BookingStart = booking.BookingStart,
                BookingEnd = booking.BookingEnd,
                Status = booking.Status,
                Created = booking.Created
            });
        }

        // PUT: api/Bookings/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] BookingUpdateRequest request)
        {
            if (id != request.BookingId)
                throw new BadRequestException("ID in URL and body do not match.");

            if (request.BookingEnd <= request.BookingStart)
                throw new BadRequestException("BookingEnd must be later than BookingStart.");

            var booking = await _bookingService.GetByIdAsync(id);
            if (booking == null)
                throw new NotFoundException($"Booking with ID {id} not found.");

            booking.DeskId = request.DeskId;
            booking.BookingStart = request.BookingStart;
            booking.BookingEnd = request.BookingEnd;
            booking.Status = request.Status;

            await _bookingService.UpdateAsync(booking);
            return NoContent();
        }

        // DELETE: api/Bookings/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            await _bookingService.DeleteAsync(id);
            return NoContent();
        }
    }
}
