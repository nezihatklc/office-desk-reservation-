using AuthDemo.DTOs;
using AuthDemo.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using AuthDemo.Data;
using AuthDemo.Helpers;
using Microsoft.AspNetCore.Identity;


namespace AuthDemo.Services;

public class AuthService
{
    private readonly AuthDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly PasswordHasher<User> _passwordHasher;

    public AuthService(AuthDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
        _passwordHasher = new PasswordHasher<User>();
    }

    public async Task<User> Register(RegisterDto dto)
    {
        var hashedPassword = HashPassword(dto.Password);
        var confirmationToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var user = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Password = hashedPassword,
            Role = "User",
            ConfirmedEmail = false,
            ConfirmedEmailToken = Guid.NewGuid().ToString()
        };
        
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 8 || !dto.Password.Any(char.IsDigit))
        {
            throw new ArgumentException("Password must be at least 8 characters and contain at least one number.");
        }

        user.Password = _passwordHasher.HashPassword(user, dto.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        
        
        Console.WriteLine($"Email confirmation link: /api/Auth/confirmEmail?userId={user.UserId}&token={confirmationToken}");
        
        return user;
    }
    
    public async Task<(string accessToken, string refreshToken)?> Login(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null) return null;
        
        var result = _passwordHasher.VerifyHashedPassword(user, user.Password, dto.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return null;
        }
        
        // It is going to delete old tokens from users.

        var oldTokens = _context.RefreshTokens.Where(r => r.UserId == user.UserId && !r.IsRevoked);
        foreach (var token in oldTokens )
        {
            token.IsRevoked = true;
        }
        _context.RefreshTokens.RemoveRange(oldTokens);
        await _context.SaveChangesAsync();

        var accessToken = JwtHelper.GenerateJwtToken(user, _configuration);
        var refreshToken = await GenerateRefreshToken(user);
        
        return (accessToken , refreshToken);
    }
    
    private string HashPassword(string password)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(password);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
    
    public async Task<bool> Logout(LogoutDto dto)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == dto.RefreshToken);

        if (token == null) return false;
        _context.RefreshTokens.Remove(token);
        
        // It will delete all tokens from that user.
        
        var userTokens = _context.RefreshTokens.Where(r => r.UserId == token.UserId);
        _context.RefreshTokens.RemoveRange(userTokens);
        
        
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<string?> RefreshToken(RefreshTokenDto dto)
    {
        var RefreshToken = await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == dto.RefreshToken && r.Expires>= DateTime.UtcNow);

        if (RefreshToken == null) return null;

        // new access token

        var newAccessToken = JwtHelper.GenerateJwtToken(RefreshToken.User, _configuration);

        return newAccessToken;
    }

    public async Task<string?> GenerateRefreshToken(User user)
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

    public async Task<bool> ConfirmEmail(int userId, string token)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null) return false;
        
        if (user.ConfirmedEmailToken != token) return false;
        
        user.ConfirmedEmail = true;
        user.ConfirmedEmailToken = null; // confirm olunca token'i siler
        await _context.SaveChangesAsync();
        
        return true;
    }

    public async Task<string?> ResendConfirmationEmail(string Email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == Email);
        if (user == null) return null;
        
        if (user.ConfirmedEmail) return null;
        
        var newToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        user.ConfirmedEmailToken = newToken;
        await _context.SaveChangesAsync();
        
        // Normalde email gönderirsin, biz console’a yazalım
        Console.WriteLine($"Resent confirmation link: /api/Auth/confirmEmail?userId={user.UserId}&token={newToken}");
        
        return newToken;
    }

public async Task<string?> ForgotPassword(ForgotPasswordDto dto)
{
    Console.WriteLine($"ForgotPassword called for: {dto.Email}");

    var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
    if (user == null)
    {
        Console.WriteLine("User not found!");
        return null;
    }

    var resetToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
        .Replace("+", "-").Replace("/", "_").Replace("=", "");

    user.ResetPasswordToken = Guid.NewGuid().ToString();
    user.ResetPasswordExpiry = DateTime.UtcNow.AddHours(1);

    _context.Entry(user).Property(u => u.ResetPasswordToken).IsModified = true;
    _context.Entry(user).Property(u => u.ResetPasswordExpiry).IsModified = true;

    var affected = await _context.SaveChangesAsync();
    Console.WriteLine($"User {user.Email} updated. Rows affected: {affected}, Token={resetToken}");

    return resetToken;
}

public async Task<bool> ResetPassword(ResetPasswordDto dto)
{
    var user = await _context.Users
        .FirstOrDefaultAsync(u=> u.ResetPasswordToken == dto.ResetToken &&
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

/*public async Task<User?> ManageInfo(ManageInfoDto dto)
{
    var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == dto.UserId);
    if (user == null) return null;

    if (!string.IsNullOrEmpty(dto.FirstName)) user.FirstName = dto.FirstName;
    if (!string.IsNullOrEmpty(dto.LastName)) user.LastName = dto.LastName;

    _context.Entry(user).Property(u => u.FirstName).IsModified = true;
    _context.Entry(user).Property(u => u.LastName).IsModified = true;

    await _context.SaveChangesAsync();
    return user;
}*/
    
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