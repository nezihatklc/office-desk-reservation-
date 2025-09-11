namespace backend.DTOs;

public class UserInfoDto
{
    public int UserId { get; set; }
    
    public string FirstName { get; set; }
    
    public string LastName { get; set; }
    
    public string Email { get; set; }
    
    public bool EmailConfirmed { get; set; }
}