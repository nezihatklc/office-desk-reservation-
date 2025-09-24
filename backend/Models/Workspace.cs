using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class Workspace
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int WorkspaceId { get; set; } 

        [Required]
        public string WorkspaceName { get; set; } = null!;

        public string? FloorNumber { get; set; }

        public string? DeskCode { get; set; }

        public int Capacity { get; set; }

        [Column("focus_mode")]
        [StringLength(40)]
        public string FocusMode { get; set; } = "Mixed";

        [Column("noise_level")]
        public int NoiseLevel { get; set; } = 3;

        [Column("team_name")]
        [StringLength(100)]
        public string? TeamName { get; set; }

        public DateTime Created { get; set; } = DateTime.UtcNow;

        // 🔗 Navigation property
        public virtual ICollection<Desk> Desks { get; set; } = new List<Desk>();
    }
}
