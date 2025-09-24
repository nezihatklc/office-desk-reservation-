namespace backend.DTOs;

public class EmailConfirmationResultDto
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public string NextStep { get; init; } = "login";
    public bool AlreadyConfirmed { get; init; }
}
