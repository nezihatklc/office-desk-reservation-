using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public partial class AppDbContext : DbContext
    {
        public AppDbContext()
        {
        }

        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }
        
        public virtual DbSet<AuditLog> AuditLogs { get; set; }
        public virtual DbSet<Booking> Bookings { get; set; }
        public virtual DbSet<Desk> Desks { get; set; }
        public virtual DbSet<Facility> Facilities { get; set; }
        public virtual DbSet<User> Users { get; set; }
        public virtual DbSet<Workspace> Workspaces { get; set; }
        public virtual DbSet<DeskFacility> DeskFacilities { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning Move your connection string to appsettings.json for safety
            => optionsBuilder.UseNpgsql("Host=localhost;Port=5433;Database=Andromeda;Username=postgres;Password=200112");
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder
                .HasPostgresExtension("btree_gist")
                .HasPostgresExtension("citext");

            {
                base.OnModelCreating(modelBuilder);


                // === AUDIT LOGS ===
                modelBuilder.Entity<AuditLog>(entity =>
                {
                    entity.HasKey(e => e.LogId).HasName("audit_logs_pkey");
                    entity.ToTable("audit_logs");

                    entity.Property(e => e.LogId).UseIdentityAlwaysColumn().HasColumnName("log_id");
                    entity.Property(e => e.Action).HasMaxLength(100).HasColumnName("action");
                    entity.Property(e => e.LogTime).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("log_time");
                    entity.Property(e => e.UserId).HasColumnName("user_id");

                    entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                        .HasForeignKey(d => d.UserId)
                        .HasConstraintName("audit_logs_user_id_fkey");
                });

                // === BOOKINGS ===
                modelBuilder.Entity<Booking>(entity =>
                {
                    entity.HasKey(e => e.BookingId).HasName("bookings_pkey");
                    entity.ToTable("bookings");

                    entity.Property(e => e.BookingId).UseIdentityAlwaysColumn().HasColumnName("booking_id");

                    entity.Property(e => e.BookingDate)   // ✅ NEW
                        .HasColumnName("booking_date")
                        .HasDefaultValueSql("CURRENT_DATE");
                    
                    entity.Property(e => e.BookingStart).HasDefaultValueSql("(date_trunc('day', CURRENT_TIMESTAMP) + '09:00:00'::interval)").HasColumnName("booking_start");
                    entity.Property(e => e.BookingEnd).HasDefaultValueSql("(date_trunc('day', CURRENT_TIMESTAMP) + '18:00:00'::interval)").HasColumnName("booking_end");
                    entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("created");
                    entity.Property(e => e.DeskId).HasColumnName("desk_id");
                    entity.Property(e => e.Status).HasMaxLength(50).HasColumnName("status");
                    entity.Property(e => e.UserId).HasColumnName("user_id");

                    entity.HasOne(d => d.Desk).WithMany(p => p.Bookings)
                        .HasForeignKey(d => d.DeskId)
                        .HasConstraintName("bookings_desk_id_fkey");

                    entity.HasOne(d => d.User).WithMany(p => p.Bookings)
                        .HasForeignKey(d => d.UserId)
                        .HasConstraintName("bookings_user_id_fkey");

             
                });


                // === DESKS ===
                modelBuilder.Entity<Desk>(entity =>
                {
                    entity.HasKey(e => e.DeskId).HasName("desks_pkey");
                    entity.ToTable("desks");

                    entity.HasIndex(e => e.DeskCode, "desks_desk_code_key").IsUnique();

                    entity.Property(e => e.DeskId).UseIdentityAlwaysColumn().HasColumnName("desk_id");
                    entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("created");
                    entity.Property(e => e.CreatedBy).HasColumnName("created_by");
                    entity.Property(e => e.DeskCode).HasMaxLength(20).HasColumnName("desk_code");
                    entity.Property(e => e.IsActive).HasColumnName("is_active");
                    entity.Property(e => e.WorkspaceId).HasColumnName("workspace_id");

                    entity.HasOne(d => d.CreatedByNavigation)
                        .WithMany(p => p.Desks)
                        .HasForeignKey(d => d.CreatedBy)
                        .OnDelete(DeleteBehavior.SetNull)
                        .HasConstraintName("desks_created_by_fkey");

                    entity.HasOne(d => d.Workspace)
                        .WithMany(p => p.Desks)
                        .HasForeignKey(d => d.WorkspaceId)
                        .HasConstraintName("desks_workspace_id_fkey");
                });

                // === FACILITIES ===
                modelBuilder.Entity<Facility>(entity =>
                {
                    entity.HasKey(e => e.FacilityId).HasName("facilities_pkey");
                    entity.ToTable("facilities");

                    entity.HasIndex(e => e.Name, "facilities_name_key").IsUnique();

                    entity.Property(e => e.FacilityId).UseIdentityAlwaysColumn().HasColumnName("facility_id");
                    entity.Property(e => e.Description).HasColumnName("description");
                    entity.Property(e => e.Name).HasMaxLength(100).HasColumnName("name");
                });

                // === DESK_FACILITIES (join table) ===
                modelBuilder.Entity<DeskFacility>(entity =>
                {
                    entity.HasKey(df => new { df.DeskId, df.FacilityId }).HasName("desk_facilities_pkey");
                    entity.ToTable("desk_facilities");

                    entity.Property(df => df.DeskId).HasColumnName("desk_id");
                    entity.Property(df => df.FacilityId).HasColumnName("facility_id");

                    entity.HasOne(df => df.Desk)
                        .WithMany(d => d.DeskFacilities)
                        .HasForeignKey(df => df.DeskId)
                        .HasConstraintName("desk_facilities_desk_id_fkey");

                    entity.HasOne(df => df.Facility)
                        .WithMany(f => f.DeskFacilities)
                        .HasForeignKey(df => df.FacilityId)
                        .HasConstraintName("desk_facilities_facility_id_fkey");
                });

                // === USERS ===
                modelBuilder.Entity<User>(entity =>
                {
                    entity.HasKey(e => e.UserId).HasName("users_pkey");
                    entity.ToTable("users");

                    entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

                    entity.Property(e => e.UserId).UseIdentityAlwaysColumn().HasColumnName("user_id");
                    entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("created");
                    entity.Property(e => e.CreatedBy).HasColumnName("created_by");
                    entity.Property(e => e.Email).HasColumnType("citext").HasColumnName("email");
                    entity.Property(e => e.FirstName).HasMaxLength(50).HasColumnName("first_name");
                    entity.Property(e => e.LastName).HasMaxLength(50).HasColumnName("last_name");
                    entity.Property(e => e.Password).HasMaxLength(100).HasColumnName("password");
                    entity.Property(e => e.TeamName).HasMaxLength(100).HasColumnName("team_name");
                    entity.Property(e => e.PreferredFocusMode).HasMaxLength(40).HasColumnName("preferred_focus_mode");

                    entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.InverseCreatedByNavigation)
                        .HasForeignKey(d => d.CreatedBy)
                        .OnDelete(DeleteBehavior.SetNull)
                        .HasConstraintName("users_created_by_fkey");
                });

                // === WORKSPACES ===
                modelBuilder.Entity<Workspace>(entity =>
                {
                    entity.HasKey(e => e.WorkspaceId).HasName("workspaces_pkey");
                    entity.ToTable("workspaces");

                    entity.HasIndex(e => e.DeskCode, "workspaces_desk_code_key").IsUnique();

                    entity.Property(e => e.WorkspaceId).UseIdentityAlwaysColumn().HasColumnName("workspace_id");
                    entity.Property(e => e.Created).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("created");
                    entity.Property(e => e.DeskCode).HasMaxLength(20).HasColumnName("desk_code");
                    entity.Property(e => e.FloorNumber).HasDefaultValueSql("'2nd Floor'::text").HasColumnName("floor_number");
                    entity.Property(e => e.WorkspaceName).HasMaxLength(50).HasColumnName("workspace_name");
                    entity.Property(e => e.Capacity).HasColumnName("capacity");
                    entity.Property(e => e.FocusMode).HasMaxLength(40).HasColumnName("focus_mode").HasDefaultValue("Mixed");
                    entity.Property(e => e.NoiseLevel).HasColumnName("noise_level").HasDefaultValue(3);
                    entity.Property(e => e.TeamName).HasMaxLength(100).HasColumnName("team_name");
                });

                // === SEED WORKSPACES ===
                var workspaceSeedCreated = new DateTime(2024, 03, 01, 0, 0, 0, DateTimeKind.Utc);

                modelBuilder.Entity<Workspace>().HasData(
                    new Workspace { WorkspaceId = 1, WorkspaceName = "A", FloorNumber = "1", DeskCode = "A", Capacity = 7, FocusMode = "Focus", NoiseLevel = 1, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 2, WorkspaceName = "B", FloorNumber = "1", DeskCode = "B", Capacity = 7, FocusMode = "Focus", NoiseLevel = 1, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 3, WorkspaceName = "C", FloorNumber = "1", DeskCode = "C", Capacity = 7, FocusMode = "Focus", NoiseLevel = 2, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 4, WorkspaceName = "D", FloorNumber = "1", DeskCode = "D", Capacity = 7, FocusMode = "Mixed", NoiseLevel = 3, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 5, WorkspaceName = "E", FloorNumber = "1", DeskCode = "E", Capacity = 7, FocusMode = "Mixed", NoiseLevel = 3, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 6, WorkspaceName = "F", FloorNumber = "1", DeskCode = "F", Capacity = 7, FocusMode = "Collaboration", NoiseLevel = 4, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 7, WorkspaceName = "G", FloorNumber = "1", DeskCode = "G", Capacity = 7, FocusMode = "Collaboration", NoiseLevel = 4, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 8, WorkspaceName = "H", FloorNumber = "1", DeskCode = "H", Capacity = 7, FocusMode = "Collaboration", NoiseLevel = 5, Created = workspaceSeedCreated },
                    new Workspace { WorkspaceId = 9, WorkspaceName = "I", FloorNumber = "1", DeskCode = "I", Capacity = 7, FocusMode = "Mixed", NoiseLevel = 2, Created = workspaceSeedCreated }
                );

                OnModelCreatingPartial(modelBuilder);
            }
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
