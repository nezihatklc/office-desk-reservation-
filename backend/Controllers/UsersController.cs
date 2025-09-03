using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using backend.Exceptions;

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

        // --------------------------------------------------------------------
        // POST /api/Users/register
        // --------------------------------------------------------------------
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _userService.Register(request);
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

        // --------------------------------------------------------------------
        // POST /api/Users/login
        // --------------------------------------------------------------------
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _userService.Login(request.Email, request.Password);
                return Ok(user);
            }
            catch (UnauthorizedException ex)
            {
                _logger.LogWarning("Failed login attempt for email: {Email}", request.Email);
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login for {Email}", request.Email);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // --------------------------------------------------------------------
        // GET /api/Users/byEmail?email={email}
        // Safe for emails with '@' without route-encoding issues.
        // Returns 404 if not found.
        // --------------------------------------------------------------------
        [HttpGet("byEmail")]
        public async Task<IActionResult> GetByEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email is required." });

            try
            {
                var user = await _userService.GetByEmail(email);
                if (user == null)
                    return NotFound(new { message = "User not found." });

                return Ok(user); // should be UserResponse from your service
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user by email: {Email}", email);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // --------------------------------------------------------------------
        // (Optional but useful)
        // GET /api/Users/{id}
        // --------------------------------------------------------------------
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            if (id <= 0)
                return BadRequest(new { message = "Invalid user id." });

            try
            {
                var user = await _userService.GetById(id);
                if (user == null)
                    return NotFound(new { message = "User not found." });

                return Ok(user); // should be UserResponse from your service
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user by id: {Id}", id);
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}
