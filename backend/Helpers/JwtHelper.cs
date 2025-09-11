using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Models;   // ✅ use backend.Models, not AuthDemo.Models
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace backend.Helpers
{
    public static class JwtHelper
    {
        public static string GenerateJwtToken(User user, IConfiguration configuration)
        {
            if (user == null) throw new ArgumentNullException(nameof(user));
            if (configuration == null) throw new ArgumentNullException(nameof(configuration));

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()), // userId
                new Claim("first_name", user.FirstName ?? string.Empty),
                new Claim("last_name", user.LastName ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            };

            // 🔹 Add role(s) if defined
            if (!string.IsNullOrEmpty(user.Role))
            {
                var roles = user.Role.Split(',');
                foreach (var role in roles)
                {
                    claims.Add(new Claim(ClaimTypes.Role, role.Trim()));
                }
            }

            // 🔹 Read JWT secret key from appsettings.json
            var key = configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(key))
                throw new InvalidOperationException("JWT Key is not configured in appsettings.json");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: configuration["Jwt:Issuer"],
                audience: configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}