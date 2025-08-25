using backend.DTOs;
using backend.Models;
using backend.Repositories;

namespace backend.Services
{
    public class UserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // ✅ Register
        public UserResponse Register(RegisterRequest request)
        {
            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Password = request.Password, // ⚠️ In production, hash before saving
                Created = DateTime.UtcNow,
                CreatedBy = request.CreatedBy
            };

            _userRepository.Add(user);

            return new UserResponse
            {
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Created = user.Created
            };
        }

        // ✅ Login
        public UserResponse? Login(string email, string password)
        {
            var user = _userRepository.GetAll()
                .FirstOrDefault(u => u.Email == email && u.Password == password);

            if (user == null) return null;

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