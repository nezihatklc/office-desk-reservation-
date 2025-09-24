namespace backend.DTOs
{
public class WorkspaceUpdateDto
{
    public string? WorkspaceName { get; set; }
    public string? FloorNumber { get; set; }
    public string? DeskCode { get; set; }
    public int? Capacity { get; set; }
    public string? TeamName { get; set; }
}
}
