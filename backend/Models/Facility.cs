using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Facility
{
    public int FacilityId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Desk> Desks { get; set; } = new List<Desk>();
}
