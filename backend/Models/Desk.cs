using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class Desk
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("desk_id")]
        public int DeskId { get; set; }

        [Required]
        [StringLength(20)]
        [Column("desk_code")]
        public string DeskCode { get; set; } = null!;

        [Column("is_active")]
        public bool IsActive { get; set; }

        [Column("created")]
        public DateTime Created { get; set; } = DateTime.UtcNow;

        [Column("created_by")]
        public int? CreatedBy { get; set; }

        // 🔑 Foreign key for Workspace
        [ForeignKey(nameof(Workspace))]
        public int WorkspaceId { get; set; }

        // 🔗 Navigation properties
        public virtual User? CreatedByNavigation { get; set; }

        public virtual Workspace Workspace { get; set; } = null!;

        public virtual ICollection<DeskFacility> DeskFacilities { get; set; } = new List<DeskFacility>();

        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}