using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class Desk
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int DeskId { get; set; }

        [Required]
        public int WorkspaceId { get; set; }

        [Required]
        [StringLength(20)]
        public string DeskCode { get; set; } = null!;

        public bool IsActive { get; set; }

        public DateTime Created { get; set; } = DateTime.UtcNow;

        public int? CreatedBy { get; set; }

        //navigation props
        
        public virtual User? CreatedByNavigation { get; set; }
        public virtual Workspace Workspace { get; set; } = null!;
    
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<DeskFacility> DeskFacilities { get; set; } = new List<DeskFacility>();
    }
}