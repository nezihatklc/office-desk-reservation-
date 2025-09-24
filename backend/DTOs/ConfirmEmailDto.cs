namespace backend.DTOs;

public class ConfirmEmailDto
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}
