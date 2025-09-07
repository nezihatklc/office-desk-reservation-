using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthDemo.Models;


[Table("refresh_tokens")]
public class RefreshToken
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    
    [Column("user_id")]
    public int UserId { get; set; }
    
    [Column("token")]
    public string Token { get; set; }
    
    [Column("expires")]
    public DateTime Expires { get; set; }

    [Column("created")] 
    public DateTime Created { get; set; } = DateTime.UtcNow;
    
    [Column("is_revoked")]
    public bool IsRevoked { get; set; }
    public User User { get; set; }

}