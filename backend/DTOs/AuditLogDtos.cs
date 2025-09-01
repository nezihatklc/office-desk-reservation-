using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class AuditLogResponse
    {
        public int LogId { get; set; }
        public int? UserId { get; set; }
        public string Action { get; set; } = null!;
        public DateTime LogTime { get; set; }
    }

    public class AuditLogCreateRequest
    {
        public int? UserId { get; set; }

        [Required]
        [StringLength(100, ErrorMessage = "Action cannot exceed 100 characters.")]
        public string Action { get; set; } = null!;
    }
}