namespace backend.DTOs
{
    public class WorkspaceResponseDto
    {
        public int WorkspaceId { get; set; }
        public string WorkspaceName { get; set; } = null!;
        public string FloorNumber { get; set; } = null!;
        public string DeskCode { get; set; } = null!;
        public DateTime Created { get; set; }
    }
}