using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class ResetPasswordDto
{
    
    [Required(ErrorMessage = "Reset password code(token) is required.")]
    public string ResetToken { get; set; }
    
    [Required(ErrorMessage = "New password is require to login.")]
    [MinLength(8, ErrorMessage = "New password must be at least 8 characters long.")]
    public string NewPassword { get; set; }
}