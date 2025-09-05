
using System;
using System.ComponentModel.DataAnnotations;
namespace backend.DTOs

{
    public class BookingResponse
    {
        public int BookingId { get; set; }
        public int UserId { get; set; }
        public int DeskId { get; set; }
        public DateTime BookingDate { get; set; }   // ✅ new
        public DateTime BookingStart { get; set; }
        public DateTime BookingEnd { get; set; }
        public string? Status { get; set; }
        public DateTime Created { get; set; }
    }

    public class BookingCreateRequest
    {
        [Required] public int UserId { get; set; }
        [Required] public int DeskId { get; set; }
        [Required] public DateTime BookingDate { get; set; }   
        [Required] public DateTime BookingStart { get; set; }
        [Required] public DateTime BookingEnd { get; set; }
        public string? Status { get; set; } = "Pending";
    }

    public class BookingUpdateRequest
    {
        [Required] public int BookingId { get; set; }
        [Required] public int DeskId { get; set; }
        [Required] public DateTime BookingDate { get; set; }
        [Required] public DateTime BookingStart { get; set; }
        [Required] public DateTime BookingEnd { get; set; }
        public string? Status { get; set; }
    }
}