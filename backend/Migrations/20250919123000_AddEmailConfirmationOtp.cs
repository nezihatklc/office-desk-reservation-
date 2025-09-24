using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations;

public partial class AddEmailConfirmationOtp : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "confirmed_email_code",
            table: "users",
            type: "varchar(6)",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "confirmed_email_code_expiry",
            table: "users",
            type: "timestamptz",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "confirmed_email_code",
            table: "users");

        migrationBuilder.DropColumn(
            name: "confirmed_email_code_expiry",
            table: "users");
    }
}
