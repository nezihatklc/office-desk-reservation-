using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class FacilityResponse
    {
        public int FacilityId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }

    public class FacilityCreateRequest
    {
        [Required]
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
        public string Name { get; set; } = null!;

        [StringLength(250, ErrorMessage = "Description cannot exceed 250 characters.")]
        public string? Description { get; set; }
    }

    public class FacilityUpdateRequest
    {
        [Required]
        public int FacilityId { get; set; }

        [Required]
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
        public string Name { get; set; } = null!;

        [StringLength(250, ErrorMessage = "Description cannot exceed 250 characters.")]
        public string? Description { get; set; }
    }
}