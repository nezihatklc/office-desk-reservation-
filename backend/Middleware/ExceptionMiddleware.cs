using System.Net;
using System.Text.Json;
using backend.Exceptions;

namespace backend.Middleware
{
    //error handling for the entire app 
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                //log exception
                _logger.LogError(ex, "Unhandled exception occurred.");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception ex)
        {
            HttpStatusCode code = HttpStatusCode.InternalServerError;
            string message = "An unexpected error occurred.";

            //map codes
            switch (ex)
            {
                case NotFoundException notFound:
                    code = HttpStatusCode.NotFound;
                    message = notFound.Message;
                    break;

                case ConflictException conflict:
                    code = HttpStatusCode.Conflict;
                    message = conflict.Message;
                    break;

                case BadRequestException badRequest:
                    code = HttpStatusCode.BadRequest;
                    message = badRequest.Message;
                    break;

                case UnauthorizedException unauthorized:
                    code = HttpStatusCode.Unauthorized;
                    message = unauthorized.Message;
                    break;
            }

            var result = JsonSerializer.Serialize(new { error = message });

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)code;

            await context.Response.WriteAsync(result);
        }
    }
}
