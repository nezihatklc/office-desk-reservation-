using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class RegisterRequest
    {
        [Required]
        public string FirstName { get; set; } = null!;

        [Required]
        public string LastName { get; set; } = null!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = null!;

        [Required]
        [MinLength(12, ErrorMessage = "Password must be at least 12 characters long.")]
        public string Password { get; set; } = null!;

        public int? CreatedBy { get; set; }
    }
    
}