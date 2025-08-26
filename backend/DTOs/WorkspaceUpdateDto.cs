namespace backend.DTOs
{
    public class WorkspaceUpdateDto
    {
        public string WorkspaceName { get; set; } = null!;
        public string FloorNumber { get; set; } = null!;
        public string DeskCode { get; set; } = null!;
    }
}