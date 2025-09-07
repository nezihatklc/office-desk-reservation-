using System.ComponentModel.DataAnnotations;

namespace AuthDemo.DTOs;

public class LogoutDto
{
    [Required(ErrorMessage = "Refresh token is required.")]
    public string RefreshToken { get; set; }
}