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

    }
    
}