using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AuthDemo.Models;

namespace AuthDemo.Helpers
{
    public static class JwtHelper
    {
        public static string GenerateJwtToken(User user, IConfiguration configuration)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()), // UserId
                new Claim("first_name",  user.FirstName),
                new Claim("last_name",  user.LastName),
                new Claim(JwtRegisteredClaimNames.Email, user.Email), // Email
            };

            // 🔹 If we add role in User.cs:
            if (!string.IsNullOrEmpty(user.Role))
            {
                // Eğer birden fazla rol varsa virgül ile ayırıp claim ekliyoruz
                var roles = user.Role.Split(',');
                foreach (var role in roles)
                {
                    claims.Add(new Claim(ClaimTypes.Role, role.Trim()));
                }
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

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