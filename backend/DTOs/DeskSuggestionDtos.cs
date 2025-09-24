using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class DeskSuggestionRequest
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public DateTimeOffset Start { get; set; }

        [Required]
        public DateTimeOffset End { get; set; }

        public int? WorkspaceId { get; set; }

        public int? Limit { get; set; }

        public bool? PrioritizeFocus { get; set; }

        public bool? AlignWithTeam { get; set; }

        public List<string>? DesiredFacilities { get; set; }
    }

    public class DeskSuggestionItemResponse
    {
        public int DeskId { get; set; }
        public string DeskCode { get; set; } = string.Empty;
        public int WorkspaceId { get; set; }
        public string? WorkspaceName { get; set; }
        public List<string> Facilities { get; set; } = new();
        public double Score { get; set; }
        public List<string> Reasons { get; set; } = new();
        public double Confidence { get; set; }
        public int TeammateCount { get; set; }
        public List<string> TeammateNames { get; set; } = new();
        public string? FocusMode { get; set; }
        public int? NoiseLevel { get; set; }
        public bool FocusMatch { get; set; }
        public bool TeamAlignmentMatch { get; set; }
    }

    public class DeskSuggestionResponse
    {
        public int UserId { get; set; }
        public DateTime RequestedStart { get; set; }
        public DateTime RequestedEnd { get; set; }
        public DateTime GeneratedAt { get; set; }
        public List<DeskSuggestionItemResponse> Suggestions { get; set; } = new();
        public string? TeamName { get; set; }
        public int TeamPresenceCount { get; set; }
        public List<string> TeamPresenceSample { get; set; } = new();
        public string? FocusPreference { get; set; }
        public bool FocusPreferenceInferred { get; set; }
    }
}
