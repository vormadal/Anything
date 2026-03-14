using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class RefactorFoodPlanToContinuousDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create FoodPlanSettings table
            migrationBuilder.CreateTable(
                name: "FoodPlanSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActiveDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 31),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoodPlanSettings", x => x.Id);
                });

            // 2. Seed FoodPlanSettings from the most recent non-deleted FoodPlan's ActiveDays
            migrationBuilder.Sql("""
                INSERT INTO "FoodPlanSettings" ("ActiveDays", "CreatedOn")
                SELECT COALESCE(
                    (SELECT "ActiveDays" FROM "FoodPlans" WHERE "DeletedOn" IS NULL ORDER BY "WeekStart" DESC LIMIT 1),
                    31
                ), NOW();
                """);

            // 3. Add Date column (nullable initially for data migration)
            migrationBuilder.AddColumn<DateTime>(
                name: "Date",
                table: "FoodPlanEntries",
                type: "timestamp with time zone",
                nullable: true);

            // 4. Add AddedToShoppingListOn column
            migrationBuilder.AddColumn<DateTime>(
                name: "AddedToShoppingListOn",
                table: "FoodPlanEntries",
                type: "timestamp with time zone",
                nullable: true);

            // 5. Populate Date from FoodPlan.WeekStart + DayOfWeek for all entries
            migrationBuilder.Sql("""
                UPDATE "FoodPlanEntries" e
                SET "Date" = (
                    SELECT fp."WeekStart" + make_interval(days => e."DayOfWeek")
                    FROM "FoodPlans" fp
                    WHERE fp."Id" = e."FoodPlanId"
                )
                WHERE e."FoodPlanId" IS NOT NULL;
                """);

            // Set a fallback date for any orphaned entries (shouldn't exist, but safety)
            migrationBuilder.Sql("""
                UPDATE "FoodPlanEntries"
                SET "Date" = "CreatedOn"
                WHERE "Date" IS NULL;
                """);

            // 6. Make Date non-nullable now that all rows have values
            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "FoodPlanEntries",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            // 7. Drop the existing FK constraint and index on FoodPlanId
            migrationBuilder.DropForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries");

            // 8. Make FoodPlanId nullable
            migrationBuilder.AlterColumn<int>(
                name: "FoodPlanId",
                table: "FoodPlanEntries",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: false);

            // 9. Re-create FK with SetNull behavior and re-create index
            migrationBuilder.AddForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId",
                principalTable: "FoodPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId");

            // 10. Set FoodPlanId to NULL for all entries (data is now in Date)
            migrationBuilder.Sql("""
                UPDATE "FoodPlanEntries" SET "FoodPlanId" = NULL;
                """);

            // 11. Add index on Date for efficient date-range queries
            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanEntries_Date",
                table: "FoodPlanEntries",
                column: "Date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove Date index
            migrationBuilder.DropIndex(
                name: "IX_FoodPlanEntries_Date",
                table: "FoodPlanEntries");

            // Drop new FK
            migrationBuilder.DropForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries");

            // Re-link entries to their original FoodPlan by matching Date against WeekStart ranges
            migrationBuilder.Sql("""
                UPDATE "FoodPlanEntries" e
                SET "FoodPlanId" = (
                    SELECT fp."Id"
                    FROM "FoodPlans" fp
                    WHERE e."Date" >= fp."WeekStart"
                      AND e."Date" < fp."WeekStart" + INTERVAL '7 days'
                    ORDER BY fp."WeekStart" DESC
                    LIMIT 1
                );
                """);

            // Delete entries that could not be re-linked (no matching FoodPlan)
            migrationBuilder.Sql("""
                DELETE FROM "FoodPlanEntries" WHERE "FoodPlanId" IS NULL;
                """);

            // Make FoodPlanId non-nullable again
            migrationBuilder.AlterColumn<int>(
                name: "FoodPlanId",
                table: "FoodPlanEntries",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId");

            // Restore cascade FK
            migrationBuilder.AddForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId",
                principalTable: "FoodPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            // Drop new columns
            migrationBuilder.DropColumn(
                name: "AddedToShoppingListOn",
                table: "FoodPlanEntries");

            migrationBuilder.DropColumn(
                name: "Date",
                table: "FoodPlanEntries");

            // Drop FoodPlanSettings table
            migrationBuilder.DropTable(
                name: "FoodPlanSettings");
        }
    }
}
