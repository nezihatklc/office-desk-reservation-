using System.ComponentModel.DataAnnotations;

namespace AuthDemo.DTOs;

public class RegisterDto
{

    [Required(ErrorMessage = "First name is required")]
    [StringLength(50, ErrorMessage = "Can't exceed 50 characters")]
    public string FirstName { get; set; }

    [Required(ErrorMessage = "Last name is required")]
    [StringLength(50, ErrorMessage = "Can't exceed 50 characters")]
    public string LastName { get; set; }

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string Email { get; set; }

    [Required]
    [MinLength(8)]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*\d).{8,}$",
        ErrorMessage = "Password must be at least 8 characters, contain at least one uppercase letter and one number.")]
    [DataType(DataType.Password)]
public string Password { get; set; }
}