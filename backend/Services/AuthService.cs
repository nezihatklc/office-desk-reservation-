using backend.DTOs;
using backend.Models;
using backend.Data;
using backend.Helpers;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace backend.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly PasswordHasher<User> _passwordHasher;

    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
        _passwordHasher = new PasswordHasher<User>();
    }

    // 🔹 Register new user
    public async Task<User> Register(RegisterDto dto)
    {
        // ✅ Password validation
        if (string.IsNullOrWhiteSpace(dto.Password) 
            || dto.Password.Length < 8 
            || !dto.Password.Any(char.IsDigit) 
            || !dto.Password.Any(char.IsUpper))
        {
            throw new ArgumentException("Password must be at least 8 characters and contain at least one uppercase letter and one number.");
        }

        var user = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Role = "User",
            ConfirmedEmail = false,
            ConfirmedEmailToken = Guid.NewGuid().ToString()
        };

        // ✅ Hash password
        user.Password = _passwordHasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        Console.WriteLine($"Email confirmation link: /api/Auth/confirmEmail?userId={user.UserId}&token={user.ConfirmedEmailToken}");

        return user;
    }

    // 🔹 Login
    public async Task<(string accessToken, string refreshToken)?> Login(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null) return null;

        var result = _passwordHasher.VerifyHashedPassword(user, user.Password, dto.Password);
        if (result == PasswordVerificationResult.Failed) return null;

        // revoke old refresh tokens
        var oldTokens = _context.RefreshTokens.Where(r => r.UserId == user.UserId && !r.IsRevoked);
        foreach (var token in oldTokens) token.IsRevoked = true;
        _context.RefreshTokens.RemoveRange(oldTokens);
        await _context.SaveChangesAsync();

        var accessToken = JwtHelper.GenerateJwtToken(user, _configuration);
        var refreshToken = await GenerateRefreshToken(user);

        return (accessToken, refreshToken);
    }

    // 🔹 Logout
    public async Task<bool> Logout(LogoutDto dto)
    {
        var token = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == dto.RefreshToken);
        if (token == null) return false;

        // revoke + delete all tokens for this user
        var userTokens = _context.RefreshTokens.Where(r => r.UserId == token.UserId);
        _context.RefreshTokens.RemoveRange(userTokens);

        await _context.SaveChangesAsync();
        return true;
    }

    // 🔹 Refresh token
    public async Task<string?> RefreshToken(RefreshTokenDto dto)
    {
        var refreshToken = await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == dto.RefreshToken && r.Expires >= DateTime.UtcNow);

        if (refreshToken == null) return null;

        return JwtHelper.GenerateJwtToken(refreshToken.User, _configuration);
    }

    // 🔹 Generate refresh token
    private async Task<string> GenerateRefreshToken(User user)
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var refreshToken = Convert.ToBase64String(randomBytes);

        var token = new RefreshToken
        {
            UserId = user.UserId,
            Token = refreshToken,
            Expires = DateTime.UtcNow.AddDays(5)
        };

        _context.RefreshTokens.Add(token);
        await _context.SaveChangesAsync();

        return refreshToken;
    }

    // 🔹 Confirm email
    public async Task<bool> ConfirmEmail(int userId, string token)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null || user.ConfirmedEmailToken != token) return false;

        user.ConfirmedEmail = true;
        user.ConfirmedEmailToken = null;

        await _context.SaveChangesAsync();
        return true;
    }

    // 🔹 Resend confirmation email
    public async Task<string?> ResendConfirmationEmail(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || user.ConfirmedEmail) return null;

        var newToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        user.ConfirmedEmailToken = newToken;
        await _context.SaveChangesAsync();

        Console.WriteLine($"Resent confirmation link: /api/Auth/confirmEmail?userId={user.UserId}&token={newToken}");
        return newToken;
    }

    // 🔹 Forgot password
    public async Task<string?> ForgotPassword(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null) return null;

        var resetToken = Guid.NewGuid().ToString("N");

        user.ResetPasswordToken = resetToken;
        user.ResetPasswordExpiry = DateTime.UtcNow.AddHours(1);

        _context.Entry(user).Property(u => u.ResetPasswordToken).IsModified = true;
        _context.Entry(user).Property(u => u.ResetPasswordExpiry).IsModified = true;

        await _context.SaveChangesAsync();

        Console.WriteLine($"Reset link: /api/Auth/resetPassword?token={resetToken}");
        return resetToken;
    }

    // 🔹 Reset password
    public async Task<bool> ResetPassword(ResetPasswordDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.ResetPasswordToken == dto.ResetToken &&
                                      u.ResetPasswordExpiry > DateTime.UtcNow);

        if (user == null) return false;

        user.Password = _passwordHasher.HashPassword(user, dto.NewPassword);
        user.ResetPasswordToken = null;
        user.ResetPasswordExpiry = null;

        _context.Entry(user).Property(u => u.Password).IsModified = true;
        _context.Entry(user).Property(u => u.ResetPasswordToken).IsModified = true;
        _context.Entry(user).Property(u => u.ResetPasswordExpiry).IsModified = true;

        await _context.SaveChangesAsync();
        return true;
    }

    // 🔹 Get user info
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
            EmailConfirmed = user.ConfirmedEmail
        };
    }
}