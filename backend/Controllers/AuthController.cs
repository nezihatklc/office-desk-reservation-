using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    // 🔹 Register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid) 
            return BadRequest(ModelState);

        var user = await _authService.Register(dto);
        return Ok(new { message = "User registered successfully", email = user.Email });
    }

    // 🔹 Login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.Login(dto);
        if (result == null) return Unauthorized(new { message = "Invalid credentials" });

        return Ok(new
        {
            accessToken = result.Value.accessToken,
            refreshToken = result.Value.refreshToken
        });
    }

    // 🔹 Logout (requires authentication)
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutDto dto)
    {
        var result = await _authService.Logout(dto);
        if (!result) return NotFound(new { message = "Refresh token not found" });

        return Ok(new { message = "Logged out successfully" });
    }

    // 🔹 Refresh access token
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
    {
        var token = await _authService.RefreshToken(dto);
        if (token == null) return Unauthorized(new { message = "Invalid or expired refresh token" });

        return Ok(new { accessToken = token });
    }

    // 🔹 Confirm email
    [HttpGet("confirmEmail")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] int userId, [FromQuery] string token)
    {
        var result = await _authService.ConfirmEmail(userId, token);
        if (!result) return BadRequest(new { message = "Invalid or expired token" });

        return Ok(new { message = "Email confirmed successfully" });
    }

    // 🔹 Resend confirmation email
    [HttpPost("resendConfirmationEmail")]
    public async Task<IActionResult> ResendConfirmationEmail([FromBody] string email)
    {
        var token = await _authService.ResendConfirmationEmail(email);
        if (token == null) return BadRequest(new { message = "User not found or already confirmed" });

        return Ok(new { message = "Confirmation email resent" });
    }

    // 🔹 Forgot password
    [HttpPost("forgotPassword")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var token = await _authService.ForgotPassword(dto);
        if (token == null) return BadRequest(new { message = "User not found" });

        return Ok(new { message = "Password reset link sent" });
    }

    // 🔹 Reset password
    [HttpPost("resetPassword")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var result = await _authService.ResetPassword(dto);
        if (!result) return BadRequest(new { message = "Invalid or expired reset token" });

        return Ok(new { message = "Password has been reset successfully" });
    }

    // 🔹 Get user info (for manage/info page)
    [HttpGet("manage/info")]
    public async Task<IActionResult> GetManageInfo([FromQuery] int userId)
    {
        var user = await _authService.GetUserInfo(userId);
        if (user == null) return NotFound(new { message = "User not found" });

        return Ok(user);
    }
}
