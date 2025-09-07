using System.ComponentModel.DataAnnotations;

namespace AuthDemo.DTOs;

public class RefreshTokenDto
{
    [Required(ErrorMessage = "Refresh token is required.")]
    public string RefreshToken { get; set; }
}