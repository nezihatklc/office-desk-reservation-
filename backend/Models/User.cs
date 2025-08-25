using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class User
{
    public int UserId { get; set; }

    public string FirstName { get; set; } = null!;

    public string LastName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string Password { get; set; } = null!;

    public DateTime Created { get; set; }

    public int? CreatedBy { get; set; }

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<Desk> Desks { get; set; } = new List<Desk>();

    public virtual ICollection<User> InverseCreatedByNavigation { get; set; } = new List<User>();
}
