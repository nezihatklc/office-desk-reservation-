using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Facility
    {
        [Key]
        public int FacilityId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = null!;

        [StringLength(250)]
        public string? Description { get; set; }

        // 🔑 Navigation: many-to-many via DeskFacilities
        public virtual ICollection<DeskFacility> DeskFacilities { get; set; } = new List<DeskFacility>();
    }
}