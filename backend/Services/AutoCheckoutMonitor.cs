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
    public class AutoCheckoutMonitor : BackgroundService
    {
        private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(BookingPolicies.AutoCheckoutSweepMinutes);
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AutoCheckoutMonitor> _logger;

        public AutoCheckoutMonitor(IServiceProvider serviceProvider, ILogger<AutoCheckoutMonitor> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Auto checkout monitor started with interval {Interval} minutes.", BookingPolicies.AutoCheckoutSweepMinutes);

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
                _logger.LogError(ex, "Unexpected error in auto checkout monitor.");
            }
            finally
            {
                _logger.LogInformation("Auto checkout monitor stopped.");
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
                _logger.LogError(ex, "Failed to load bookings for auto checkout sweep.");
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

                if (!ShouldAutoCheckout(booking, nowUtc))
                {
                    continue;
                }

                try
                {
                    await bookingRepository.SetStatusAsync(booking, "CheckedOut", cancellationToken);
                    booking.Status = "CheckedOut";

                    await auditLogService.AddAsync(new AuditLog
                    {
                        UserId = booking.UserId,
                        Action = $"Auto checked out booking {booking.BookingId} (Desk {booking.DeskId}) after office close",
                        LogTime = DateTime.UtcNow
                    });

                    await SendNotificationAsync(emailService, booking, nowUtc);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to auto-checkout booking {BookingId}", booking.BookingId);
                }
            }
        }

        private static bool ShouldAutoCheckout(Booking booking, DateTime nowUtc)
        {
            var status = booking.Status?.Trim();
            if (string.IsNullOrEmpty(status))
            {
                return false;
            }

            if (status.Equals("CheckedOut", StringComparison.OrdinalIgnoreCase) ||
                status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) ||
                status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!status.Equals("CheckedIn", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var tz = GetIstanbulTimeZone();
            var bookingStartLocal = TimeZoneInfo.ConvertTimeFromUtc(NormalizeToUtc(booking.BookingStart), tz);
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

            if (bookingStartLocal.Date > nowLocal.Date)
            {
                return false;
            }

            var targetLocal = new DateTime(
                bookingStartLocal.Year,
                bookingStartLocal.Month,
                bookingStartLocal.Day,
                BookingPolicies.AutoCheckoutHour,
                BookingPolicies.AutoCheckoutMinute,
                0,
                DateTimeKind.Unspecified);

            var targetUtc = TimeZoneInfo.ConvertTimeToUtc(targetLocal, tz);
            if (nowUtc < targetUtc)
            {
                return false;
            }

            return true;
        }

        private static async Task SendNotificationAsync(IEmailService emailService, Booking booking, DateTime checkoutUtc)
        {
            var recipient = booking.User?.Email;
            if (string.IsNullOrWhiteSpace(recipient))
            {
                return;
            }

            var deskLabel = booking.Desk?.DeskCode ?? $"Desk #{booking.DeskId}";
            var startUtc = NormalizeToUtc(booking.BookingStart);
            var endUtc = NormalizeToUtc(booking.BookingEnd);

            var formattedDate = FormatInIstanbul(startUtc, "dddd, dd MMM yyyy");
            var formattedStart = FormatInIstanbul(startUtc, "HH:mm");
            var formattedEnd = FormatInIstanbul(endUtc, "HH:mm");
            var formattedCheckout = FormatInIstanbul(checkoutUtc, "HH:mm");

            var subject = "Checked out automatically";
            var sb = new StringBuilder();
            sb.AppendLine($"Hello {FormatUserName(booking)},");
            sb.AppendLine();
            sb.AppendLine($"We automatically checked you out of {deskLabel} for {formattedDate}.");
            sb.AppendLine("Office close-out happens daily, five minutes after 18:00 (TR time).");
            sb.AppendLine();
            sb.AppendLine($"Reservation window: {formattedStart} – {formattedEnd} (TR)");
            sb.AppendLine($"Automatic checkout time: {formattedCheckout} (TR)");
            sb.AppendLine();
            sb.AppendLine("If you need to stay longer tomorrow, feel free to create a fresh reservation or contact the workplace team.");
            sb.AppendLine();
            sb.AppendLine("— Office Desk Reservation System");

            await emailService.SendAsync(recipient, subject, sb.ToString());
        }

        private static DateTime NormalizeToUtc(DateTime value) => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

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
