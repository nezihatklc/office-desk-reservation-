using backend.DTOs;
using backend.Models;
using backend.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace backend.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly PasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _config;
    private readonly IEmailService _emailService;

    public AuthService(AppDbContext context, IConfiguration config, IEmailService emailService)
    {
        _context = context;
        _passwordHasher = new PasswordHasher<User>();
        _config = config;
        _emailService = emailService;
    }

    // === Helper: Generate URL-safe token ===
    private string GenerateOtpCode()
    {
        // Generate a 6-digit numeric code
        var value = RandomNumberGenerator.GetInt32(0, 1_000_000);
        return value.ToString("000000");
    }
    
    private void AssignEmailConfirmationChallenge(User user)
    {
        var otp = GenerateOtpCode();
        user.ConfirmedEmailToken = Guid.NewGuid().ToString("N");
        user.ConfirmedEmailCode = otp;
        user.ConfirmedEmailCodeExpiry = DateTime.UtcNow.AddMinutes(15);
    }

    // === REGISTER ===
    public async Task<User> Register(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Password)
            || dto.Password.Length < 8
            || !dto.Password.Any(char.IsDigit)
            || !dto.Password.Any(char.IsUpper))
        {
            throw new ArgumentException("Password must be at least 8 characters and contain at least one uppercase letter and one number.");
        }

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (existingUser != null)
            throw new ArgumentException("Email already exists.");

        var user = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Role = "User",
            ConfirmedEmail = false,
        };

        user.Password = _passwordHasher.HashPassword(user, dto.Password);
        AssignEmailConfirmationChallenge(user);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await SendConfirmationEmail(user.Email, user.ConfirmedEmailToken!, user.ConfirmedEmailCode!);

        return user;
    }

    // === LOGIN ===
    public async Task<User?> Login(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null) return null;

        var result = _passwordHasher.VerifyHashedPassword(user, user.Password, dto.Password);
        if (result == PasswordVerificationResult.Failed) return null;

        if (!user.ConfirmedEmail)
        {
            throw new InvalidOperationException("Please confirm your email before signing in.");
        }

        return user;
    }

    public async Task<string> ConfirmEmail(string email, string token, string code)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            throw new ArgumentException("User not found.");

        // 1️⃣ Already confirmed?
        if (user.ConfirmedEmail)
            return "Email already confirmed.";

        // 2️⃣ Token missing?
        if (string.IsNullOrEmpty(user.ConfirmedEmailToken))
            throw new InvalidOperationException("Confirmation token missing. Please request a new one.");

        // 3️⃣ Token mismatch?
        if (!string.Equals(user.ConfirmedEmailToken, token, StringComparison.Ordinal))
            throw new ArgumentException("Invalid or expired token.");

        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Confirmation code is required.");

        if (string.IsNullOrWhiteSpace(user.ConfirmedEmailCode) ||
            !string.Equals(user.ConfirmedEmailCode, code, StringComparison.Ordinal))
        {
            throw new ArgumentException("Invalid confirmation code.");
        }

        if (user.ConfirmedEmailCodeExpiry is not null && user.ConfirmedEmailCodeExpiry < DateTime.UtcNow)
            throw new ArgumentException("Confirmation code has expired. Please request a new one.");

        // 4️⃣ Confirm email
        user.ConfirmedEmail = true;
        user.ConfirmedEmailToken = null;
        user.ConfirmedEmailCode = null;
        user.ConfirmedEmailCodeExpiry = null;

        _context.Entry(user).Property(u => u.ConfirmedEmail).IsModified = true;
        _context.Entry(user).Property(u => u.ConfirmedEmailToken).IsModified = true;
        _context.Entry(user).Property(u => u.ConfirmedEmailCode).IsModified = true;
        _context.Entry(user).Property(u => u.ConfirmedEmailCodeExpiry).IsModified = true;

        await _context.SaveChangesAsync();

        return "Email confirmed successfully.";
    }

    private string BuildConfirmationUrl(string email, string token, string? otpCode = null)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("Token is required.", nameof(token));

        var frontendUrl = _config["AppSettings:FrontendUrl"] ?? "http://localhost:5173";
        var normalizedBase = frontendUrl.TrimEnd('/');
        var encodedToken = Uri.EscapeDataString(token);
        var encodedEmail = Uri.EscapeDataString(email);
        var baseUrl = $"{normalizedBase}/confirm-email?token={encodedToken}&email={encodedEmail}";

        if (!string.IsNullOrWhiteSpace(otpCode))
        {
            baseUrl += $"&prefillCode={Uri.EscapeDataString(otpCode)}";
        }

        return baseUrl;
    }

    private async Task<string> SendConfirmationEmail(string email, string token, string otpCode)
    {
        var confirmUrl = BuildConfirmationUrl(email, token, otpCode);

        Console.WriteLine($"[DEBUG] Confirmation URL: {confirmUrl}");

        await _emailService.SendAsync(
            email,
            "Confirm your account",
            $@"<p>Welcome! 🎉</p>
           <p>Please confirm your account by using the six-digit code below:</p>
           <p style='font-size:24px;font-weight:bold;letter-spacing:6px;'>{otpCode}</p>
           <p>This code expires in 15 minutes. You can enter it on the confirmation page or click <a href='{confirmUrl}'>this link</a> and paste the code when prompted.</p>
            <p>If you didn’t create this account, you can safely ignore this email.</p>"
        );

        return confirmUrl;
    }

    public async Task<(string ConfirmationUrl, string OtpCode)> ResendConfirmationEmail(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            throw new ArgumentException("User not found.");
        if (user.ConfirmedEmail)
            throw new InvalidOperationException("Email is already confirmed.");

        AssignEmailConfirmationChallenge(user);

        _context.Entry(user).Property(u => u.ConfirmedEmailToken).IsModified = true;
        _context.Entry(user).Property(u => u.ConfirmedEmailCode).IsModified = true;
        _context.Entry(user).Property(u => u.ConfirmedEmailCodeExpiry).IsModified = true;
        await _context.SaveChangesAsync();

        var confirmationUrl = await SendConfirmationEmail(email, user.ConfirmedEmailToken!, user.ConfirmedEmailCode!);

        return (confirmationUrl, user.ConfirmedEmailCode!);
    }



    // === FORGOT PASSWORD ===
    public async Task<(string Token, string ResetUrl)?> ForgotPassword(ForgotPasswordDto dto)
    {
        var email = dto.Email?.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return null;

        var resetToken = Guid.NewGuid().ToString("N");

        user.ResetPasswordToken = resetToken;
        user.ResetPasswordExpiry = DateTime.UtcNow.AddHours(1);

        _context.Entry(user).Property(u => u.ResetPasswordToken).IsModified = true;
        _context.Entry(user).Property(u => u.ResetPasswordExpiry).IsModified = true;

        await _context.SaveChangesAsync();

        var resetUrl = BuildResetPasswordUrl(email, resetToken);

#if DEBUG
        Console.WriteLine($"[DEBUG] Password reset token for {email}: {resetToken}");
        Console.WriteLine($"[DEBUG] Reset URL: {resetUrl}");
#endif

        await _emailService.SendAsync(
            email,
            "Reset your password",
            $@"<p>Hello {user.FirstName},</p>
               <p>We received a request to reset the password for your account. Click the link below to choose a new password:</p>
               <p><a href='{resetUrl}' target='_blank' rel='noopener'>Reset Password</a></p>
               <p>This link expires in 60 minutes. If you did not request a password reset, you can safely ignore this email.</p>"
        );

        return (resetToken, resetUrl);
    }

    // === RESET PASSWORD ===
    public async Task<bool> ResetPassword(ResetPasswordDto dto)
    {
        if (dto is null)
        {
            throw new ArgumentNullException(nameof(dto));
        }

        var newPassword = dto.NewPassword?.Trim() ?? string.Empty;

        if (newPassword.Length < 8 ||
            !newPassword.Any(char.IsDigit) ||
            !newPassword.Any(char.IsUpper))
        {
            throw new ArgumentException("New password must be at least 8 characters long and include an uppercase letter and a number.");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ResetPasswordToken == dto.ResetToken &&
                                      u.ResetPasswordExpiry > DateTime.UtcNow);

        if (user == null) return false;

        user.Password = _passwordHasher.HashPassword(user, newPassword);
        user.ResetPasswordToken = null;
        user.ResetPasswordExpiry = null;

        _context.Entry(user).Property(u => u.Password).IsModified = true;
        _context.Entry(user).Property(u => u.ResetPasswordToken).IsModified = true;
        _context.Entry(user).Property(u => u.ResetPasswordExpiry).IsModified = true;

        await _context.SaveChangesAsync();
        return true;
    }

    private string BuildResetPasswordUrl(string email, string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("Token is required.", nameof(token));

        var frontendUrl = _config["AppSettings:FrontendUrl"] ?? "http://localhost:5173";
        var normalizedBase = frontendUrl.TrimEnd('/');
        var encodedToken = Uri.EscapeDataString(token);
        var encodedEmail = Uri.EscapeDataString(email);

        return $"{normalizedBase}/reset-password?token={encodedToken}&email={encodedEmail}";
    }

    public string GetConfirmationUrl(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        if (string.IsNullOrWhiteSpace(user.Email))
            throw new ArgumentException("Email is required to build a confirmation URL.", nameof(user));

        if (string.IsNullOrWhiteSpace(user.ConfirmedEmailToken))
            throw new InvalidOperationException("Confirmation token missing for user.");

        return BuildConfirmationUrl(user.Email, user.ConfirmedEmailToken, user.ConfirmedEmailCode);
    }

    // === MANAGE INFO ===
    public async Task<UserInfoDto?> GetUserInfo(int userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null) return null;

        return new UserInfoDto
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            EmailConfirmed = user.ConfirmedEmail,
            Role = user.Role
        };
    }

    // === UPDATE USER INFO ===
    public async Task<UserInfoDto?> UpdateUserInfo(UpdateUserInfoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
        throw new ArgumentException("First name and last name are required.");
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == dto.UserId);
        if (user == null) return null;
        user.FirstName = dto.FirstName.Trim();
        user.LastName = dto.LastName.Trim();
        _context.Entry(user).Property(u => u.FirstName).IsModified = true;
        _context.Entry(user).Property(u => u.LastName).IsModified = true;
        await _context.SaveChangesAsync();
        return new UserInfoDto
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            EmailConfirmed = user.ConfirmedEmail,
            Role = user.Role
        };
    }
}
