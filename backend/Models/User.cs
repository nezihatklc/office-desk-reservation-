using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

[Table("users")]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // EF will let Postgres auto-generate UserId
    public int UserId { get; set; }

    [Column("first_name")]
    public string FirstName { get; set; } = null!;

    [Column("last_name")]
    public string LastName { get; set; } = null!;

    [Column("email")]
    public string Email { get; set; } = null!;

    [Column("password")]
    public string Password { get; set; } = null!;

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

    [Column("confirmed_email_code", TypeName = "varchar(6)")]
    public string? ConfirmedEmailCode { get; set; }

    [Column("confirmed_email_code_expiry", TypeName = "timestamptz")]
    public DateTime? ConfirmedEmailCodeExpiry { get; set; }

    [Column("team_name")]
    [StringLength(100)]
    public string? TeamName { get; set; }

    [Column("preferred_focus_mode")]
    [StringLength(40)]
    public string? PreferredFocusMode { get; set; }

    [Column("reset_password_token",  TypeName = "varchar(250)")]
    public string? ResetPasswordToken { get; set; }

    [Column("reset_password_expiry", TypeName = "timestamptz")]
    public DateTime? ResetPasswordExpiry { get; set; }
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<Desk> Desks { get; set; } = new List<Desk>();

    public virtual ICollection<User> InverseCreatedByNavigation { get; set; } = new List<User>();
}
