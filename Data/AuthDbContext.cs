using AuthDemo.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.Storage.Internal.Mapping;


namespace AuthDemo.Data;

public class AuthDbContext : DbContext

{

    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
    {}

    public DbSet<User> Users { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    // Eğer rezervasyon sisteminden başka tabloları da eklemek istersen:
    // public DbSet<Booking> Bookings { get; set; }
    // public DbSet<Desk> Desks { get; set; }
    // public DbSet<AuditLog> AuditLogs { get; set; }
    // vs.

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Email unique olsun
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
        
        modelBuilder.Entity<User>()
            .Property(u => u.Created)
            .HasDefaultValueSql("now()");

        // İleride Token tabloları eklersen (refresh_tokens vs.) onları da burada configleyebiliriz.

    }
}