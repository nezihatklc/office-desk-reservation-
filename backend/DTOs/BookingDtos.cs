
using System;
using System.ComponentModel.DataAnnotations;
namespace backend.DTOs

{
    public class BookingUserResponse
    {
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool EmailConfirmed { get; set; }
    }

    public class BookingResponse
    {
        public int BookingId { get; set; }
        public int UserId { get; set; }
        public int DeskId { get; set; }
        public string? DeskCode { get; set; }
        public DateTime BookingDate { get; set; }
        public DateTime BookingStart { get; set; }
        public DateTime BookingEnd { get; set; }
        public string? Status { get; set; }
        public DateTime Created { get; set; }
        public BookingUserResponse? User { get; set; }
    }

    public class BookingCreateRequest
    {
        [Required] public int UserId { get; set; }
        [Required] public int DeskId { get; set; }
        [Required] public DateTimeOffset BookingDate { get; set; }
        [Required] public DateTimeOffset BookingStart { get; set; }
        [Required] public DateTimeOffset BookingEnd { get; set; }
        public string? Status { get; set; } = "Pending";
    }

    public class BookingUpdateRequest
    {
        [Required] public int BookingId { get; set; }
        [Required] public int DeskId { get; set; }
        [Required] public DateTimeOffset BookingDate { get; set; }
        [Required] public DateTimeOffset BookingStart { get; set; }
        [Required] public DateTimeOffset BookingEnd { get; set; }
        public string? Status { get; set; }
    }

    public class BookingCheckoutRequest
    {
        [Required]
        public int PerformedByUserId { get; set; }
    }

    public class BookingCheckinRequest
    {
        [Required]
        public int PerformedByUserId { get; set; }
    }
}
