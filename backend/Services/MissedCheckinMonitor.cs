using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using backend.Models;
using backend.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace backend.Services
{
    public class MissedCheckinMonitor : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MissedCheckinMonitor> _logger;
        private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(BookingPolicies.AutoCancellationSweepMinutes);

        public MissedCheckinMonitor(IServiceProvider serviceProvider, ILogger<MissedCheckinMonitor> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Missed check-in monitor started with interval {Interval} minutes.", BookingPolicies.AutoCancellationSweepMinutes);

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    await SweepAsync(stoppingToken);
                    await Task.Delay(SweepInterval, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                // graceful shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in missed check-in monitor.");
            }
            finally
            {
                _logger.LogInformation("Missed check-in monitor stopped.");
            }
        }

        private async Task SweepAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var bookingRepository = scope.ServiceProvider.GetRequiredService<IBookingRepository>();
            var auditLogService = scope.ServiceProvider.GetRequiredService<AuditLogService>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            List<Booking> bookings;
            try
            {
                bookings = await bookingRepository.GetAllAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load bookings for missed check-in sweep.");
                return;
            }

            if (bookings.Count == 0)
            {
                return;
            }

            var nowUtc = DateTime.UtcNow;
            foreach (var booking in bookings)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                if (!ShouldAutoCancel(booking, nowUtc))
                {
                    continue;
                }

                try
                {
                    await bookingRepository.SetStatusAsync(booking, "Cancelled", cancellationToken);

                    await auditLogService.AddAsync(new AuditLog
                    {
                        UserId = booking.UserId,
                        Action = $"Auto-cancelled booking {booking.BookingId} (Desk {booking.DeskId}) after missed check-in",
                        LogTime = DateTime.UtcNow
                    });

                    await SendNotificationAsync(emailService, booking, nowUtc);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to auto-cancel booking {BookingId}", booking.BookingId);
                }
            }
        }

        private static bool ShouldAutoCancel(Booking booking, DateTime nowUtc)
        {
            var status = booking.Status?.Trim();
            if (!string.IsNullOrEmpty(status))
            {
                if (status.Equals("CheckedIn", StringComparison.OrdinalIgnoreCase) ||
                    status.Equals("CheckedOut", StringComparison.OrdinalIgnoreCase) ||
                    status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) ||
                    status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            var startUtc = NormalizeToUtc(booking.BookingStart);
            if (startUtc.Date > nowUtc.Date)
            {
                return false;
            }

            var deadlineUtc = startUtc.AddMinutes(BookingPolicies.CheckinGraceMinutes);
            if (nowUtc <= deadlineUtc)
            {
                return false;
            }

            // Booking is overdue and still not checked in.
            return true;
        }

        private static async Task SendNotificationAsync(IEmailService emailService, Booking booking, DateTime cancellationUtc)
        {
            var recipient = booking.User?.Email;
            if (string.IsNullOrWhiteSpace(recipient))
            {
                return;
            }

            var deskLabel = booking.Desk?.DeskCode ?? $"Desk #{booking.DeskId}";
            var startUtc = NormalizeToUtc(booking.BookingStart);

            if ((cancellationUtc - startUtc).TotalDays > 1)
            {
                return;
            }

            var formattedStart = FormatInIstanbul(startUtc, "dddd, dd MMM yyyy HH:mm");
            var formattedCancellation = FormatInIstanbul(cancellationUtc, "HH:mm");

            var subject = "Reservation cancelled due to missed check-in";
            var sb = new StringBuilder();
            sb.AppendLine($"Hello {FormatUserName(booking)},");
            sb.AppendLine();
            sb.AppendLine($"We cancelled your reservation for {deskLabel} because no check-in was recorded within {BookingPolicies.CheckinGraceMinutes} minutes of the start time.");
            sb.AppendLine();
            sb.AppendLine($"Reservation start time: {formattedStart} (TR)");
            sb.AppendLine($"Cancellation time: {formattedCancellation} (TR)");
            sb.AppendLine();
            sb.AppendLine("If this was unexpected, please create a new reservation or contact the workplace team.");
            sb.AppendLine();
            sb.AppendLine("— Office Desk Reservation System");

            await emailService.SendAsync(recipient, subject, sb.ToString());
        }

        private static string FormatUserName(Booking booking)
        {
            var firstName = booking.User?.FirstName?.Trim();
            var lastName = booking.User?.LastName?.Trim();
            if (string.IsNullOrEmpty(firstName) && string.IsNullOrEmpty(lastName))
            {
                return booking.User?.Email ?? "there";
            }

            if (!string.IsNullOrEmpty(firstName) && !string.IsNullOrEmpty(lastName))
            {
                return $"{firstName} {lastName}";
            }

            return firstName ?? lastName ?? booking.User?.Email ?? "there";
        }

        private static DateTime NormalizeToUtc(DateTime value) => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        private static string FormatInIstanbul(DateTime utcValue, string format)
        {
            var tz = GetIstanbulTimeZone();
            var local = TimeZoneInfo.ConvertTimeFromUtc(utcValue, tz);
            return local.ToString(format, CultureInfo.InvariantCulture);
        }

        private static TimeZoneInfo GetIstanbulTimeZone()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
            }
            catch (TimeZoneNotFoundException)
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
            }
            catch (InvalidTimeZoneException)
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
            }
        }
    }
}
