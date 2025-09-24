using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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

    // === REGISTER ===
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            var user = await _authService.Register(dto);

            var response = new Dictionary<string, object>
            {
                ["message"] = "Registration successful. Redirecting to the email confirmation page.",
                ["nextStep"] = "confirm-email",
                ["user"] = new
                {
                    user.UserId,
                    user.FirstName,
                    user.LastName,
                    user.Email,
                    Role = user.Role
                }
            };

#if DEBUG
            response["devConfirmUrl"] = _authService.GetConfirmationUrl(user);
            response["devConfirmCode"] = user.ConfirmedEmailCode;
#endif

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // === LOGIN ===
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var user = await _authService.Login(dto);
            if (user == null)
                return Unauthorized(new { message = "Invalid email or password" });

            return Ok(new
            {
                message = "Login successful",
                user = new
                {
                    user.UserId,
                    user.FirstName,
                    user.LastName,
                    user.Email,
                    EmailConfirmed = user.ConfirmedEmail,
                    Role = user.Role
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    // === CONFIRM EMAIL ===
    [HttpPost("confirmEmail")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailDto dto)
    {
        try
        {
            var result = await _authService.ConfirmEmail(dto.Email, dto.Token, dto.Code);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    // === RESEND CONFIRMATION EMAIL ===
    [HttpPost("resendConfirmationEmail")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ResendConfirmationEmail([FromBody] ResendEmailDto dto)
    {
        try
        {
            var (confirmUrl, otpCode) = await _authService.ResendConfirmationEmail(dto.Email);

            var response = new Dictionary<string, object>
            {
                { "message", "A new confirmation email has been sent. Please check your inbox." }
            };

#if DEBUG
            response["devConfirmUrl"] = confirmUrl;
            response["devConfirmCode"] = otpCode;
#endif

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    // === FORGOT PASSWORD ===
    [HttpPost("forgotPassword")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        try
        {
            var result = await _authService.ForgotPassword(dto);
            if (result == null)
                return NotFound(new { message = "User not found" });

            var response = new Dictionary<string, object>
            {
                ["message"] = "Password reset link sent to email."
            };

#if DEBUG
            response["devToken"] = result.Value.Token;
            response["devResetUrl"] = result.Value.ResetUrl;
#endif
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // === RESET PASSWORD ===
    [HttpPost("resetPassword")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            var result = await _authService.ResetPassword(dto);
            if (!result)
                return BadRequest(new { message = "Invalid or expired reset token" });

            return Ok(new { message = "Password has been reset successfully" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // === MANAGE INFO ===
    [HttpGet("manage/info")]
    public async Task<IActionResult> GetManageInfo([FromQuery] int userId)
    {
        var user = await _authService.GetUserInfo(userId);
        if (user == null) return NotFound(new { message = "User not found" });

        return Ok(user);
    }

    // === UPDATE MANAGE INFO ===
    [HttpPut("manage/info")]
    public async Task<IActionResult> UpdateManageInfo([FromBody] UpdateUserInfoDto dto)
    {
        try
        {
            var user = await _authService.UpdateUserInfo(dto);
            if (user == null) return NotFound(new { message = "User not found" });
            return Ok(new
            {
                message = "Profile updated successfully.",
                user
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
