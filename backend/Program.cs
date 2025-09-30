using backend.Data;
using backend.Repositories;
using backend.Services;
using backend.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// === SWAGGER ===
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Office Desk Reservation API", Version = "v1" });

});

// === DATABASE (PostgreSQL) ===
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// === REPOSITORIES ===
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IDeskRepository, DeskRepository>();
builder.Services.AddScoped<IFacilityRepository, FacilityRepository>();
builder.Services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// === SERVICES ===
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<DeskService>();
builder.Services.AddScoped<FacilityService>();
builder.Services.AddScoped<WorkspaceService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<DeskRecommendationService>();
builder.Services.AddScoped<IEmailService, ConsoleEmailService>();
builder.Services.AddHostedService<MissedCheckinMonitor>();
builder.Services.AddHostedService<AutoCheckoutMonitor>();

// === CONTROLLERS ===
builder.Services.AddControllers();

// === CORS ===
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",  // Vite frontend
                "https://localhost:5173",
                "http://localhost:5138",  // Swagger
                "https://localhost:5138"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// === MIDDLEWARE PIPELINE ===
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionMiddleware>();

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();

app.MapControllers();

app.Run();
