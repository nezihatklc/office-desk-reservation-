using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixWorkspaceSeedTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 1,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 2,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 3,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 4,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 5,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 6,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 7,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 8,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 9,
                column: "created",
                value: new DateTime(2024, 3, 1, 0, 0, 0, 0, DateTimeKind.Utc));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 1,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(510));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 2,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 3,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 4,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 5,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 6,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 7,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1490));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 8,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1490));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 9,
                column: "created",
                value: new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1490));
        }
    }
}
