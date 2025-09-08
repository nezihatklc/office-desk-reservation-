namespace backend.DTOs
{
    public class DeskResponse
    {
        public int DeskId { get; set; }
        public int WorkspaceId { get; set; }
        public string DeskCode { get; set; } = null!;
        public bool IsActive { get; set; }
        public List<string> Facilities { get; set; }
    }

    public class DeskCreateRequest
    {
        public int WorkspaceId { get; set; }
        public string DeskCode { get; set; } = null!;
        public bool IsActive { get; set; } = true;
    }

    public class DeskUpdateRequest
    {
        public int DeskId { get; set; }
        public string DeskCode { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}