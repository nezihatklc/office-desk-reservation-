using backend.DTOs;
using backend.Models;
using backend.Repositories;
using Microsoft.Extensions.Logging;

namespace backend.Services;

public class DeskRecommendationService
{
    private readonly IDeskRepository _deskRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly IUserRepository _userRepository;
    private readonly FacilityService _facilityService;
    private readonly ILogger<DeskRecommendationService> _logger;

    public DeskRecommendationService(
        IDeskRepository deskRepository,
        IBookingRepository bookingRepository,
        FacilityService facilityService,
        IUserRepository userRepository,
        ILogger<DeskRecommendationService> logger)
    {
        _deskRepository = deskRepository;
        _bookingRepository = bookingRepository;
        _facilityService = facilityService;
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<DeskSuggestionResponse> SuggestAsync(DeskSuggestionRequest request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (request.UserId <= 0)
        {
            throw new ArgumentException("UserId must be provided", nameof(request.UserId));
        }

        var startUtc = request.Start.UtcDateTime;
        var endUtc = request.End.UtcDateTime;
        if (endUtc <= startUtc)
        {
            throw new ArgumentException("End time must be after the start time.");
        }

        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user is null)
        {
            throw new ArgumentException($"User {request.UserId} was not found.", nameof(request.UserId));
        }

        var allDesks = await _deskRepository.GetAllAsync();
        var allBookings = await _bookingRepository.GetAllAsync();
        var facilityLookup = await BuildFacilityLookupAsync();

        var deskById = allDesks.ToDictionary(d => d.DeskId);
        var userBookings = allBookings
            .Where(b => b.UserId == request.UserId)
            .OrderByDescending(b => b.BookingStart)
            .ToList();

        var focusPreference = DetermineFocusPreference(user, userBookings, deskById);
        var focusPreferenceIsInferred = string.IsNullOrWhiteSpace(user.PreferredFocusMode);
        var preferFocus = request.PrioritizeFocus == true || (!request.PrioritizeFocus.HasValue && focusPreference == FocusPreference.Focus);
        var preferCollaboration = request.PrioritizeFocus == false || (!request.PrioritizeFocus.HasValue && focusPreference == FocusPreference.Collaboration);
        var alignWithTeam = request.AlignWithTeam ?? !string.IsNullOrWhiteSpace(user.TeamName);

        var desiredFacilityKeys = (request.DesiredFacilities ?? new List<string>())
            .Select(NormalizeFacilityKey)
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var availableDesks = allDesks
            .Where(d => d.IsActive && !HasOverlap(d.DeskId, startUtc, endUtc, allBookings))
            .ToList();

        var deskUsage = BuildDeskUsage(userBookings);
        var workspacePreference = BuildWorkspacePreference(userBookings, deskById);
        var facilityPreference = BuildFacilityPreference(userBookings, deskById, facilityLookup);

        var teamPresence = BuildTeamPresence(user, allBookings, deskById, startUtc, endUtc, out var teamSampleNames);
        var totalTeamPresence = teamPresence.Values.Sum(stats => Math.Max(stats.OverlapCount, stats.SameDayCount));

        var results = new List<DeskSuggestionItemResponse>();

        foreach (var desk in availableDesks)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var facilities = ResolveFacilities(desk, facilityLookup);
            var components = ExpandFacilityComponents(facilities).ToList();

            double score = 0d;
            var reasons = new List<string>();
            var matchedPreferences = new HashSet<string>();
            var matchedDesired = new HashSet<string>();

            if (deskUsage.TryGetValue(desk.DeskId, out var usage))
            {
                score += usage.WeightedScore * 2.5;
                reasons.Add($"You've booked {desk.DeskCode} {usage.Count} time(s).");

                if ((DateTime.UtcNow - usage.LastUsed).TotalDays <= 30)
                {
                    reasons.Add("Keeps you close to your recent routine.");
                }
            }

            if (workspacePreference.TryGetValue(desk.WorkspaceId, out var workspaceScore))
            {
                score += workspaceScore * 1.6;
                var workspaceLabel = desk.Workspace?.WorkspaceName ?? $"Workspace {desk.WorkspaceId}";
                reasons.Add($"Workspace {workspaceLabel} is among your most used zones.");
            }

            if (request.WorkspaceId.HasValue)
            {
                if (desk.WorkspaceId == request.WorkspaceId.Value)
                {
                    score += 3.0;
                    reasons.Add("Matches the workspace you asked for.");
                }
                else
                {
                    score -= 1.4;
                }
            }

            var deskFocus = NormalizeFocusMode(desk.Workspace?.FocusMode);
            var noiseLevel = desk.Workspace?.NoiseLevel ?? 3;
            var focusMatch = false;

            if (preferFocus)
            {
                if (deskFocus == FocusPreference.Focus)
                {
                    score += 3.5;
                    reasons.Add("Quiet focus zone aligned with your work style.");
                    focusMatch = true;
                }
                else if (deskFocus == FocusPreference.Collaboration)
                {
                    score -= 1.6;
                }

                score += Math.Max(0, 4 - noiseLevel) * 0.4;
                if (noiseLevel <= 2)
                {
                    reasons.Add($"Low-noise setting ({DescribeNoiseLevel(noiseLevel)}).");
                }
            }
            else if (preferCollaboration)
            {
                if (deskFocus == FocusPreference.Collaboration)
                {
                    score += 2.8;
                    reasons.Add("Energetic collaboration zone keeps you near the buzz.");
                    focusMatch = true;
                }
                else if (deskFocus == FocusPreference.Focus)
                {
                    score -= 1.0;
                }

                score += Math.Max(0, noiseLevel - 2) * 0.35;
                if (noiseLevel >= 4)
                {
                    reasons.Add($"Closer to the buzz ({DescribeNoiseLevel(noiseLevel)}).");
                }
            }
            else if (deskFocus == FocusPreference.Mixed)
            {
                score += 0.6;
            }
            else if (focusPreference != FocusPreference.Unknown && deskFocus == focusPreference)
            {
                focusMatch = true;
                score += 0.8;
            }

            double facilityScore = 0d;

            foreach (var component in components)
            {
                var key = NormalizeFacilityKey(component);
                if (string.IsNullOrEmpty(key))
                {
                    continue;
                }

                if (facilityPreference.TryGetValue(key, out var preference))
                {
                    facilityScore += preference.Weight;
                    matchedPreferences.Add(preference.Label);
                }

                if (desiredFacilityKeys.Contains(key))
                {
                    facilityScore += 2.4;
                    matchedDesired.Add(component);
                }
            }

            if (facilityScore > 0)
            {
                score += facilityScore;
                if (matchedDesired.Count > 0)
                {
                    reasons.Add($"Matches requested gear: {string.Join(", ", matchedDesired)}.");
                }

                if (matchedPreferences.Count > 0)
                {
                    reasons.Add($"Offers gear you favour: {string.Join(", ", matchedPreferences)}.");
                }
            }

            if (facilities.Count > 0)
            {
                score += 0.2 * facilities.Count;
                if (matchedDesired.Count == 0 && matchedPreferences.Count == 0)
                {
                    reasons.Add($"Equipped with {string.Join(", ", facilities)}.");
                }
            }

            var teammateCount = 0;
            var teammateNames = new List<string>();
            var teamAlignmentMatch = false;

            if (!string.IsNullOrWhiteSpace(user.TeamName) && teamPresence.Count > 0)
            {
                if (teamPresence.TryGetValue(desk.WorkspaceId, out var stats))
                {
                    teammateCount = stats.OverlapCount > 0 ? stats.OverlapCount : stats.SameDayCount;
                    if (teammateCount > 0)
                    {
                        var sampleNames = stats.TeammateNames.Take(3).ToList();
                        teammateNames.AddRange(sampleNames);
                        var namesLabel = sampleNames.Count switch
                        {
                            0 => "teammates",
                            1 => sampleNames[0],
                            2 => string.Join(" & ", sampleNames),
                            _ => $"{sampleNames[0]}, {sampleNames[1]}" + (sampleNames.Count > 2 ? " +" : string.Empty)
                        };

                        if (stats.OverlapCount > 0)
                        {
                            score += 4.0 + teammateCount;
                            reasons.Add($"Team calendar shows {namesLabel} in this zone during your slot.");
                            teamAlignmentMatch = true;
                        }
                        else
                        {
                            score += 2.0 + teammateCount * 0.5;
                            reasons.Add($"Team calendar shows {namesLabel} on-site in this zone today.");
                        }
                    }
                    else if (alignWithTeam)
                    {
                        score -= 0.9;
                    }
                }
                else if (alignWithTeam)
                {
                    score -= 1.2;
                }
            }

            if (alignWithTeam && teammateCount > 0)
            {
                score += 1.2;
                teamAlignmentMatch = true;
            }

            if (score <= 0)
            {
                score += 1 + facilities.Count * 0.1;
                if (reasons.Count == 0)
                {
                    reasons.Add("Available and ready for a first-time try.");
                }
            }

            results.Add(new DeskSuggestionItemResponse
            {
                DeskId = desk.DeskId,
                DeskCode = desk.DeskCode,
                WorkspaceId = desk.WorkspaceId,
                WorkspaceName = desk.Workspace?.WorkspaceName,
                Facilities = facilities,
                Score = Math.Round(score, 3),
                Reasons = reasons.Distinct().ToList(),
                TeammateCount = teammateCount,
                TeammateNames = teammateNames.Distinct().ToList(),
                FocusMode = desk.Workspace?.FocusMode,
                NoiseLevel = desk.Workspace?.NoiseLevel,
                FocusMatch = focusMatch,
                TeamAlignmentMatch = teamAlignmentMatch
            });
        }

        var ordered = results
            .OrderByDescending(r => r.Score)
            .ThenBy(r => r.DeskCode, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (ordered.Count == 0)
        {
            _logger.LogInformation("No available desks for user {UserId} between {Start} and {End}", request.UserId, startUtc, endUtc);
        }

        var maxScore = ordered.FirstOrDefault()?.Score ?? 0d;
        var minScore = ordered.LastOrDefault()?.Score ?? 0d;
        var spread = maxScore - minScore;
        if (ordered.Count > 0)
        {
            foreach (var item in ordered)
            {
                var confidence = spread <= 0 ? 1d : (item.Score - minScore) / spread;
                item.Confidence = Math.Round(Math.Clamp(confidence, 0d, 1d), 3);
            }
        }

        var limit = Math.Clamp(request.Limit ?? 3, 1, 10);

        return new DeskSuggestionResponse
        {
            UserId = request.UserId,
            RequestedStart = startUtc,
            RequestedEnd = endUtc,
            GeneratedAt = DateTime.UtcNow,
            Suggestions = ordered.Take(limit).ToList(),
            TeamName = user.TeamName,
            TeamPresenceCount = totalTeamPresence,
            TeamPresenceSample = teamSampleNames,
            FocusPreference = FocusPreferenceLabel(focusPreference),
            FocusPreferenceInferred = focusPreferenceIsInferred && focusPreference != FocusPreference.Unknown
        };
    }

    private async Task<Dictionary<string, List<string>>> BuildFacilityLookupAsync()
    {
        var facilities = await _facilityService.GetAllAsync();
        var lookup = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var facility in facilities)
        {
            if (string.IsNullOrWhiteSpace(facility.Name))
            {
                continue;
            }

            var key = NormalizeKey(facility.Name);
            if (string.IsNullOrEmpty(key))
            {
                continue;
            }

            var label = string.IsNullOrWhiteSpace(facility.Description)
                ? facility.Name
                : facility.Description!;

            if (!lookup.TryGetValue(key, out var list))
            {
                list = new List<string>();
                lookup[key] = list;
            }

            if (!string.IsNullOrWhiteSpace(label))
            {
                list.Add(label.Trim());
            }
        }

        return lookup;
    }

    private static Dictionary<int, DeskUsageStats> BuildDeskUsage(IEnumerable<Booking> bookings)
    {
        var usage = new Dictionary<int, DeskUsageStats>();

        foreach (var booking in bookings)
        {
            var daysAgo = (DateTime.UtcNow - booking.BookingStart).TotalDays;
            var weight = CalculateRecencyWeight(daysAgo);

            if (usage.TryGetValue(booking.DeskId, out var existing))
            {
                usage[booking.DeskId] = existing with
                {
                    Count = existing.Count + 1,
                    LastUsed = existing.LastUsed > booking.BookingStart ? existing.LastUsed : booking.BookingStart,
                    WeightedScore = existing.WeightedScore + weight
                };
            }
            else
            {
                usage[booking.DeskId] = new DeskUsageStats
                {
                    Count = 1,
                    LastUsed = booking.BookingStart,
                    WeightedScore = weight
                };
            }
        }

        return usage;
    }

    private static Dictionary<int, double> BuildWorkspacePreference(IEnumerable<Booking> bookings, IReadOnlyDictionary<int, Desk> deskById)
    {
        var preference = new Dictionary<int, double>();

        foreach (var booking in bookings)
        {
            if (!deskById.TryGetValue(booking.DeskId, out var desk))
            {
                continue;
            }

            var daysAgo = (DateTime.UtcNow - booking.BookingStart).TotalDays;
            var weight = CalculateRecencyWeight(daysAgo);

            if (preference.ContainsKey(desk.WorkspaceId))
            {
                preference[desk.WorkspaceId] += weight;
            }
            else
            {
                preference[desk.WorkspaceId] = weight;
            }
        }

        return preference;
    }

    private static Dictionary<string, FacilityPreference> BuildFacilityPreference(
        IEnumerable<Booking> bookings,
        IReadOnlyDictionary<int, Desk> deskById,
        IReadOnlyDictionary<string, List<string>> fallback)
    {
        var preference = new Dictionary<string, FacilityPreference>(StringComparer.OrdinalIgnoreCase);

        foreach (var booking in bookings)
        {
            if (!deskById.TryGetValue(booking.DeskId, out var desk))
            {
                continue;
            }

            var facilities = ResolveFacilities(desk, fallback);
            if (facilities.Count == 0)
            {
                continue;
            }

            var daysAgo = (DateTime.UtcNow - booking.BookingStart).TotalDays;
            var weight = CalculateRecencyWeight(daysAgo);

            foreach (var component in ExpandFacilityComponents(facilities))
            {
                var key = NormalizeFacilityKey(component);
                if (string.IsNullOrEmpty(key))
                {
                    continue;
                }

                if (preference.TryGetValue(key, out var existing))
                {
                    existing.Weight += weight;
                }
                else
                {
                    preference[key] = new FacilityPreference
                    {
                        Weight = weight,
                        Label = component
                    };
                }
            }
        }

        return preference;
    }

    private static List<string> ResolveFacilities(Desk desk, IReadOnlyDictionary<string, List<string>> fallback)
    {
        var facilities = desk.DeskFacilities
            .Where(df => df.Facility != null)
            .Select(df => string.IsNullOrWhiteSpace(df.Facility.Description)
                ? df.Facility.Name
                : df.Facility.Description)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (facilities.Count == 0)
        {
            var key = NormalizeKey(desk.DeskCode, desk.Workspace?.WorkspaceName);
            if (!string.IsNullOrWhiteSpace(key) && fallback.TryGetValue(key, out var fallbackFacilities))
            {
                facilities = fallbackFacilities.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            }
        }

        return facilities;
    }

    private static IEnumerable<string> ExpandFacilityComponents(IEnumerable<string> facilities)
    {
        foreach (var facility in facilities)
        {
            if (string.IsNullOrWhiteSpace(facility))
            {
                continue;
            }

            var normalized = facility
                .Replace("•", "-")
                .Replace("/", "-");

            foreach (var part in normalized.Split(new[] { '-', ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var cleaned = part.Trim();
                if (cleaned.Length == 0)
                {
                    continue;
                }

                yield return cleaned;
            }
        }
    }

    private static bool HasOverlap(int deskId, DateTime start, DateTime end, IEnumerable<Booking> bookings)
    {
        foreach (var booking in bookings)
        {
            if (booking.DeskId != deskId)
            {
                continue;
            }

            if (IntervalsOverlap(booking.BookingStart, booking.BookingEnd, start, end))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IntervalsOverlap(DateTime aStart, DateTime aEnd, DateTime bStart, DateTime bEnd)
    {
        return aStart < bEnd && aEnd > bStart;
    }

    private static double CalculateRecencyWeight(double daysAgo)
    {
        if (daysAgo < 0)
        {
            daysAgo = 0;
        }

        return daysAgo switch
        {
            < 7 => 3.0,
            < 30 => 2.0,
            < 90 => 1.3,
            < 180 => 1.0,
            _ => 0.6
        };
    }

    private static string NormalizeKey(string? deskCode, string? workspaceName = null)
    {
        string? code = deskCode;
        if (string.IsNullOrWhiteSpace(code) && !string.IsNullOrWhiteSpace(workspaceName))
        {
            code = workspaceName;
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return string.Empty;
        }

        var trimmed = code.Trim();
        var firstToken = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? trimmed;
        var match = System.Text.RegularExpressions.Regex.Match(firstToken, @"^([A-Za-z]+)[^0-9A-Za-z]*?(\d+)$");

        if (match.Success)
        {
            var prefix = match.Groups[1].Value.ToUpperInvariant();
            var number = int.Parse(match.Groups[2].Value);
            return $"{prefix}{number}";
        }

        var normalized = new string(firstToken.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        return normalized;
    }

    private static string NormalizeFacilityKey(string value)
    {
        var span = value.Trim().ToLowerInvariant();
        var builder = new System.Text.StringBuilder(span.Length);
        foreach (var ch in span)
        {
            if (char.IsLetterOrDigit(ch))
            {
                builder.Append(ch);
            }
        }

        return builder.ToString();
    }

    private static FocusPreference DetermineFocusPreference(
        User user,
        IReadOnlyCollection<Booking> bookings,
        IReadOnlyDictionary<int, Desk> deskById)
    {
        var configured = NormalizeFocusMode(user.PreferredFocusMode);
        if (configured != FocusPreference.Unknown)
        {
            return configured;
        }

        if (bookings.Count == 0)
        {
            return FocusPreference.Unknown;
        }

        var scoreByFocus = new Dictionary<FocusPreference, double>();

        foreach (var booking in bookings)
        {
            if (!deskById.TryGetValue(booking.DeskId, out var desk))
            {
                continue;
            }

            var focus = NormalizeFocusMode(desk.Workspace?.FocusMode);
            if (focus == FocusPreference.Unknown)
            {
                continue;
            }

            var daysAgo = (DateTime.UtcNow - booking.BookingStart).TotalDays;
            var weight = CalculateRecencyWeight(daysAgo);

            if (scoreByFocus.ContainsKey(focus))
            {
                scoreByFocus[focus] += weight;
            }
            else
            {
                scoreByFocus[focus] = weight;
            }
        }

        if (scoreByFocus.Count == 0)
        {
            return FocusPreference.Unknown;
        }

        var ordered = scoreByFocus.OrderByDescending(pair => pair.Value).ToList();
        var top = ordered.First();
        var total = ordered.Sum(pair => pair.Value);

        if (total > 0 && top.Value / total < 0.45)
        {
            return FocusPreference.Mixed;
        }

        return top.Key;
    }

    private static FocusPreference NormalizeFocusMode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return FocusPreference.Unknown;
        }

        return value.Trim().ToLowerInvariant() switch
        {
            "focus" or "quiet" => FocusPreference.Focus,
            "collaboration" or "collaborative" or "buzz" => FocusPreference.Collaboration,
            "mixed" or "hybrid" => FocusPreference.Mixed,
            _ => FocusPreference.Unknown
        };
    }

    private static string? FocusPreferenceLabel(FocusPreference preference)
    {
        return preference switch
        {
            FocusPreference.Focus => "Focus",
            FocusPreference.Collaboration => "Collaboration",
            FocusPreference.Mixed => "Mixed",
            _ => null
        };
    }

    private static string DescribeNoiseLevel(int noiseLevel)
    {
        return noiseLevel switch
        {
            <= 1 => "library-quiet",
            2 => "quiet focus",
            3 => "balanced",
            4 => "collaboration buzz",
            >= 5 => "lively collaboration"
        };
    }

    private static string FormatName(User? user)
    {
        if (user is null)
        {
            return string.Empty;
        }

        var first = (user.FirstName ?? string.Empty).Trim();
        var last = (user.LastName ?? string.Empty).Trim();
        var combined = string.Join(' ', new[] { first, last }.Where(part => !string.IsNullOrEmpty(part)));
        return string.IsNullOrWhiteSpace(combined) ? (user.Email ?? $"User {user.UserId}") : combined;
    }

    private static Dictionary<int, TeamPresenceStats> BuildTeamPresence(
        User user,
        IEnumerable<Booking> bookings,
        IReadOnlyDictionary<int, Desk> deskById,
        DateTime startUtc,
        DateTime endUtc,
        out List<string> sampleNames)
    {
        sampleNames = new List<string>();

        if (string.IsNullOrWhiteSpace(user.TeamName))
        {
            return new Dictionary<int, TeamPresenceStats>();
        }

        var presence = new Dictionary<int, TeamPresenceStats>();
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var booking in bookings)
        {
            if (booking.UserId == user.UserId)
            {
                continue;
            }

            var teammate = booking.User;
            if (teammate == null || string.IsNullOrWhiteSpace(teammate.TeamName))
            {
                continue;
            }

            if (!string.Equals(teammate.TeamName, user.TeamName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!deskById.TryGetValue(booking.DeskId, out var desk))
            {
                continue;
            }

            var overlaps = IntervalsOverlap(booking.BookingStart, booking.BookingEnd, startUtc, endUtc);
            var sameDay = booking.BookingStart.Date == startUtc.Date;

            if (!overlaps && !sameDay)
            {
                continue;
            }

            if (!presence.TryGetValue(desk.WorkspaceId, out var stats))
            {
                stats = new TeamPresenceStats();
                presence[desk.WorkspaceId] = stats;
            }

            if (overlaps)
            {
                stats.OverlapCount++;
            }

            if (sameDay)
            {
                stats.SameDayCount++;
            }

            var displayName = FormatName(teammate);
            if (!string.IsNullOrEmpty(displayName))
            {
                stats.TeammateNames.Add(displayName);
                if (seenNames.Add(displayName) && seenNames.Count <= 8)
                {
                    sampleNames.Add(displayName);
                }
            }

            if (!string.IsNullOrWhiteSpace(desk.DeskCode))
            {
                stats.DeskCodes.Add(desk.DeskCode);
            }
        }

        return presence;
    }

    private sealed class FacilityPreference
    {
        public double Weight { get; set; }
        public string Label { get; set; } = string.Empty;
    }

    private sealed record DeskUsageStats
    {
        public int Count { get; init; }
        public DateTime LastUsed { get; init; }
        public double WeightedScore { get; init; }
    }

    private sealed class TeamPresenceStats
    {
        public int OverlapCount { get; set; }
        public int SameDayCount { get; set; }
        public HashSet<string> TeammateNames { get; } = new(StringComparer.OrdinalIgnoreCase);
        public HashSet<string> DeskCodes { get; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private enum FocusPreference
    {
        Unknown = 0,
        Focus = 1,
        Collaboration = 2,
        Mixed = 3
    }
}
