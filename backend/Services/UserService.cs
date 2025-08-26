using System.Text.RegularExpressions;
using backend.DTOs;
using backend.Models;
using backend.Repositories;

public class UserService
{
    
    private readonly IUserRepository _userRepository;

    
    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public UserResponse Register(RegisterRequest request)
    {
        //check if req fields are done
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Email and Password are required.");

        //format
        if (!request.Email.Contains("@"))
            throw new ArgumentException("Invalid email format.");

        //password rule
        if (request.Password.Length < 12)
            throw new ArgumentException("Password must be at least 12 characters long.");
        if (!Regex.IsMatch(request.Password, @"[!@#$%^&*(),.?""{}|<>]"))
            throw new ArgumentException("Password must contain at least one special character.");
        if (!Regex.IsMatch(request.Password, @"\d"))
            throw new ArgumentException("Password must contain at least one digit.");
        if (!Regex.IsMatch(request.Password, @"[A-Z]"))
            throw new ArgumentException("Password must contain at least one uppercase letter.");

        //what if email aşredyexists--reject 
        var existingUser = _userRepository
            .GetAll()
            .FirstOrDefault(u => u.Email == request.Email);
        if (existingUser != null)
            throw new InvalidOperationException("User with this email already exists.");

        //hash password
        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Password = request.Password, // ⚠ currently stored in plaintext
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

    public UserResponse? Login(string email, string password)
    {
        var user = _userRepository.GetAll().FirstOrDefault(u => u.Email == email);

        // In real app: verify hashed password
        if (user == null || user.Password != password)
            return null;

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
