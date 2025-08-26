using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(UserService userService, ILogger<UsersController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = _userService.Register(request);
                return Ok(user);
            }
            catch (InvalidOperationException ex) // duplicate email
            {
                _logger.LogWarning("Duplicate registration attempt for email: {Email}", request.Email);
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Invalid registration attempt for email: {Email}", request.Email);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = _userService.Login(request.Email, request.Password);

            if (user == null)
            {
                _logger.LogWarning("Failed login attempt for email: {Email}", request.Email);
                return Unauthorized(new { message = "Invalid email or password" });
            }

            return Ok(user);
        }
    }
    
}