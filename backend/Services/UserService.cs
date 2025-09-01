using System.Text.RegularExpressions;
using backend.DTOs;
using backend.Models;
using backend.Repositories;
using backend.Exceptions;

namespace backend.Services
{
    public class UserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<UserResponse> Register(RegisterRequest request)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
                throw new BadRequestException("Email and Password are required.");

            // Validate email format
            if (!Regex.IsMatch(request.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                throw new BadRequestException("Invalid email format.");

            // Validate password rules
            if (request.Password.Length < 12)
                throw new BadRequestException("Password must be at least 12 characters long.");
            if (!Regex.IsMatch(request.Password, @"[!@#$%^&*(),.?""{}|<>]"))
                throw new BadRequestException("Password must contain at least one special character.");
            if (!Regex.IsMatch(request.Password, @"\d"))
                throw new BadRequestException("Password must contain at least one digit.");
            if (!Regex.IsMatch(request.Password, @"[A-Z]"))
                throw new BadRequestException("Password must contain at least one uppercase letter.");

            // Check for unique email
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
                throw new ConflictException("User with this email already exists.");

            // Hash password
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Password = hashedPassword,
                CreatedBy = request.CreatedBy,
                Created = DateTime.UtcNow
            };

            await _userRepository.AddAsync(user);

            return new UserResponse
            {
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Created = user.Created
            };
        }

        public async Task<UserResponse> Login(string email, string password)
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
                throw new UnauthorizedException("Invalid email or password.");

            // Verify hashed password
            bool validPassword = BCrypt.Net.BCrypt.Verify(password, user.Password);
            if (!validPassword)
                throw new UnauthorizedException("Invalid email or password.");

            return new UserResponse
            {
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Created = user.Created
            };
        }
    }
}
