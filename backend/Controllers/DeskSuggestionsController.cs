using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DeskSuggestionsController : ControllerBase
{
    private readonly DeskRecommendationService _deskRecommendationService;

    public DeskSuggestionsController(DeskRecommendationService deskRecommendationService)
    {
        _deskRecommendationService = deskRecommendationService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(DeskSuggestionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DeskSuggestionResponse>> Post([FromBody] DeskSuggestionRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        if (request.UserId <= 0)
        {
            return BadRequest("A valid userId must be provided.");
        }

        var response = await _deskRecommendationService.SuggestAsync(request, cancellationToken);
        return Ok(response);
    }
}
