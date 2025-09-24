using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'bookings' AND column_name = 'booking_date'
                    ) THEN
                        ALTER TABLE bookings
                        ADD COLUMN booking_date timestamp with time zone NOT NULL DEFAULT (CURRENT_DATE);
                    END IF;
                END
                $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'bookings' AND column_name = 'booking_date'
                    ) THEN
                        ALTER TABLE bookings
                        DROP COLUMN booking_date;
                    END IF;
                END
                $$;");
        }
    }
}
