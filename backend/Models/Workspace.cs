
using System;
using System.Collections.Generic;

namespace backend.Models
{
    public partial class Workspace
    {
        public int WorkspaceId { get; set; }

        public string WorkspaceName { get; set; } = null!;

        public string FloorNumber { get; set; } = null!;

        public string DeskCode { get; set; } = null!;

        public int Capacity { get; set; }   

        public DateTime Created { get; set; }

        public virtual ICollection<Desk> Desks { get; set; } = new List<Desk>();
    }
    
}
