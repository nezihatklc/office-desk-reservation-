using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Booking
{
    public int BookingId { get; set; }

    public int UserId { get; set; }

    public int DeskId { get; set; }
    
    public DateTime BookingDate { get; set; }

    public DateTime BookingStart { get; set; }

    public DateTime BookingEnd { get; set; }

    public string? Status { get; set; }

    public DateTime Created { get; set; }

    public virtual Desk Desk { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
