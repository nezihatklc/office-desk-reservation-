using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class ResendEmailDto
    {
        [Required]
        [EmailAddress(ErrorMessage = "Invalid email address.")]
        public string Email { get; set; } = null!;
    }
}