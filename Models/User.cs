using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthDemo.Models;

[Table("users")]
public class User
{
    
    [Key]
    [Column("user_id")]
    public int UserId { get; set; }
    
    [Column("first_name")]
    public string FirstName { get; set; }
    
    [Column("last_name")]
    public string LastName { get; set; }
    
    [Column("email")]
    public string Email { get; set; }
    
    [Column("password")]
    public string Password { get; set; }
    
    [Column("created")]
    public DateTime Created { get; set; }
    
    [Column("created_by")]
    public int? CreatedBy { get; set; }
    
    [Column("role")]
    public string Role { get; set; } = "User";
    
    [Column("confirmed_email")]
    public bool ConfirmedEmail { get; set; }
    
    [Column("confirmed_email_token")]
    public string? ConfirmedEmailToken { get; set; }
    
    [Column("reset_password_token",  TypeName = "varchar(250)")]
    public string? ResetPasswordToken { get; set; }
    
    [Column("reset_password_expiry", TypeName = "timestamptz")]
    public DateTime? ResetPasswordExpiry { get; set; }
    
}