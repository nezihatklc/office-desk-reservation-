using System.Text.RegularExpressions;
using backend.DTOs;
using backend.Models;
using backend.Repositories;
using backend.Exceptions;
using BCrypt.Net;

public class UserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public UserResponse Register(RegisterRequest request)
    {
        //req field val
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
            throw new BadRequestException("Email and Password are required.");

        //email format val
        if (!request.Email.Contains("@"))
            throw new BadRequestException("Invalid email format.");

        //pword rules
        if (request.Password.Length < 12)
            throw new BadRequestException("Password must be at least 12 characters long.");
        if (!Regex.IsMatch(request.Password, @"[!@#$%^&*(),.?""{}|<>]"))
            throw new BadRequestException("Password must contain at least one special character.");
        if (!Regex.IsMatch(request.Password, @"\d"))
            throw new BadRequestException("Password must contain at least one digit.");
        if (!Regex.IsMatch(request.Password, @"[A-Z]"))
            throw new BadRequestException("Password must contain at least one uppercase letter.");

        //should be unique email
        var existingUser = _userRepository.GetAll().FirstOrDefault(u => u.Email == request.Email);
        if (existingUser != null)
            throw new ConflictException("User with this email already exists.");

        //has psswrd
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Password = hashedPassword,
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

    public UserResponse Login(string email, string password)
    {
        var user = _userRepository.GetAll().FirstOrDefault(u => u.Email == email);

        if (user == null)
            throw new UnauthorizedException("Invalid email or password.");

        //verify hashhed password
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
