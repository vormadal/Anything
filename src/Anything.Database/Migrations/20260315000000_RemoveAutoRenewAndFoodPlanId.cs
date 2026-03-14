using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAutoRenewAndFoodPlanId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropColumn(
                name: "FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropTable(
                name: "FoodPlans");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedOn",
                table: "FoodPlanSettings",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FoodPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActiveDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 31),
                    AutoRenew = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    WeekStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoodPlans", x => x.Id);
                });

            migrationBuilder.AddColumn<int>(
                name: "FoodPlanId",
                table: "FoodPlanEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId",
                principalTable: "FoodPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedOn",
                table: "FoodPlanSettings",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);
        }
    }
}
