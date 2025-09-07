using AuthDemo.DTOs;
using AuthDemo.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace AuthDemo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        
        if (!ModelState.IsValid)
        { 
            return BadRequest(ModelState);
        }
        
        var user = await _authService.Register(dto);
        return Ok(new { message = "User registered", user.Email });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.Login(dto);
        if (result == null) return Unauthorized("Invalid credentials");

        return Ok(new 
        { 
            accessToken = result.Value.accessToken, 
            refreshToken = result.Value.refreshToken 
        });
    }
    
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutDto dto)
    {
        var result = await _authService.Logout(dto);
        if (!result) return NotFound(new { message = "Refresh token not found" });

        return Ok(new { message = "Logged out successfully" });
    }
    
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshTokenDto dto)
    {
        var token = await _authService.RefreshToken(dto);
        if (token == null) return Unauthorized("Invalid or expired refresh token");
        return Ok(new { token });
    }
    
    [HttpGet("confirmEmail")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] int userId, [FromQuery] string token)
    {
        var result = await _authService.ConfirmEmail(userId, token);
        if (!result) return BadRequest("Invalid token");
        return Ok("Email confirmed successfully");
    }

    [HttpPost("resendConfirmationEmail")]
    public async Task<IActionResult> ResendConfirmationEmail([FromBody] string email)
    {
        var token = await _authService.ResendConfirmationEmail(email);
        if (token == null) return BadRequest("User not found or already confirmed");

        return Ok("Confirmation email resent");
    }
    
    [HttpPost("forgotPassword")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var token = await _authService.ForgotPassword(dto);
        if (token == null) return BadRequest("User not found");
        return Ok("Password reset link sent");
    }
    
    [HttpPost("resetPassword")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var result = await _authService.ResetPassword(dto);
        if (!result) return BadRequest("Invalid or expired token");
        return Ok("Password has been reset successfully");
    }
    
    [HttpGet("manage/info")]
    public async Task<IActionResult> GetManageInfo([FromQuery] int userId)
    {
        var user = await _authService.GetUserInfo(userId);
        if (user == null) return NotFound("User not found");

        return Ok(user);
    }
}