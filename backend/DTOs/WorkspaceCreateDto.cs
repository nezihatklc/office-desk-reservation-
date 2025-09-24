namespace backend.DTOs
{
    public class WorkspaceCreateDto
    {
        public string WorkspaceName { get; set; } = null!;
        public string FloorNumber { get; set; } = null!;
        public string DeskCode { get; set; } = null!;
        public int Capacity { get; set; }
        public string? TeamName { get; set; }
    }
}
