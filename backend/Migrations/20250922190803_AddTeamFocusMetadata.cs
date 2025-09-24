using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamFocusMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'workspaces' AND column_name = 'focus_mode'
                    ) THEN
                        ALTER TABLE workspaces
                        ADD COLUMN focus_mode character varying(40) NOT NULL DEFAULT 'Mixed';
                    END IF;
                END
                $$;");

            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'workspaces' AND column_name = 'noise_level'
                    ) THEN
                        ALTER TABLE workspaces
                        ADD COLUMN noise_level integer NOT NULL DEFAULT 3;
                    END IF;
                END
                $$;");

            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'preferred_focus_mode'
                    ) THEN
                        ALTER TABLE users
                        ADD COLUMN preferred_focus_mode character varying(40);
                    END IF;
                END
                $$;");

            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'team_name'
                    ) THEN
                        ALTER TABLE users
                        ADD COLUMN team_name character varying(100);
                    END IF;
                END
                $$;");

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 1,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(510), "Focus", 1 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 2,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480), "Focus", 1 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 3,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480), "Focus", 2 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 4,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480), "Mixed", 3 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 5,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480), "Mixed", 3 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 6,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1480), "Collaboration", 4 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 7,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1490), "Collaboration", 4 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 8,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1490), "Collaboration", 5 });

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 9,
                columns: new[] { "created", "focus_mode", "noise_level" },
                values: new object[] { new DateTime(2025, 9, 22, 19, 8, 2, 987, DateTimeKind.Utc).AddTicks(1490), "Mixed", 2 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'workspaces' AND column_name = 'focus_mode'
                    ) THEN
                        ALTER TABLE workspaces DROP COLUMN focus_mode;
                    END IF;
                END
                $$;");

            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'workspaces' AND column_name = 'noise_level'
                    ) THEN
                        ALTER TABLE workspaces DROP COLUMN noise_level;
                    END IF;
                END
                $$;");

            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'preferred_focus_mode'
                    ) THEN
                        ALTER TABLE users DROP COLUMN preferred_focus_mode;
                    END IF;
                END
                $$;");

            migrationBuilder.Sql(
                @"DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'team_name'
                    ) THEN
                        ALTER TABLE users DROP COLUMN team_name;
                    END IF;
                END
                $$;");

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 1,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(2350));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 2,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3080));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 3,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3080));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 4,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3090));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 5,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3090));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 6,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3090));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 7,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3090));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 8,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3090));

            migrationBuilder.UpdateData(
                table: "workspaces",
                keyColumn: "workspace_id",
                keyValue: 9,
                column: "created",
                value: new DateTime(2025, 9, 19, 11, 19, 1, 548, DateTimeKind.Utc).AddTicks(3090));
        }
    }
}
