using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Desk
{
    public int DeskId { get; set; }

    public int WorkspaceId { get; set; }

    public string DeskCode { get; set; } = null!;

    public bool Isactive { get; set; }

    public DateTime Created { get; set; }

    public int? CreatedBy { get; set; }

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual User? CreatedByNavigation { get; set; }

    public virtual Workspace Workspace { get; set; } = null!;

    public virtual ICollection<Facility> Facilities { get; set; } = new List<Facility>();
}
