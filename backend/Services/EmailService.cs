using System;
using System.Threading.Tasks;

namespace backend.Services
{
    public class ConsoleEmailService : IEmailService
    {
        public Task SendAsync(string to, string subject, string htmlBody)
        {
            Console.WriteLine("=== EMAIL SIMULATION ===");
            Console.WriteLine($"To: {to}");
            Console.WriteLine($"Subject: {subject}");
            Console.WriteLine($"Body: {htmlBody}");
            Console.WriteLine("========================");
            return Task.CompletedTask;
        }
    }
}