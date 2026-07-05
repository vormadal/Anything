using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class Auto_20260705135613 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SeasonalTagsSeededOn",
                table: "FoodPlanSettings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SuggestionExclusionWindowDays",
                table: "FoodPlanSettings",
                type: "integer",
                nullable: false,
                defaultValue: 6);

            migrationBuilder.AddColumn<int>(
                name: "SuggestionFavoritesWeight",
                table: "FoodPlanSettings",
                type: "integer",
                nullable: false,
                defaultValue: 25);

            migrationBuilder.AddColumn<int>(
                name: "SuggestionRotationSaturationDays",
                table: "FoodPlanSettings",
                type: "integer",
                nullable: false,
                defaultValue: 84);

            migrationBuilder.AddColumn<int>(
                name: "SuggestionRotationWeight",
                table: "FoodPlanSettings",
                type: "integer",
                nullable: false,
                defaultValue: 40);

            migrationBuilder.AddColumn<int>(
                name: "SuggestionSeasonalityWeight",
                table: "FoodPlanSettings",
                type: "integer",
                nullable: false,
                defaultValue: 20);

            migrationBuilder.AddColumn<int>(
                name: "SuggestionSeasonalityWindowDays",
                table: "FoodPlanSettings",
                type: "integer",
                nullable: false,
                defaultValue: 21);

            migrationBuilder.CreateTable(
                name: "SeasonalTagRule",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HouseholdId = table.Column<int>(type: "integer", nullable: false),
                    Keyword = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MatchPrefix = table.Column<bool>(type: "boolean", nullable: false),
                    Months = table.Column<int>(type: "integer", nullable: false),
                    Boost = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeasonalTagRule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeasonalTagRule_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SeasonalTagRule_HouseholdId",
                table: "SeasonalTagRule",
                column: "HouseholdId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SeasonalTagRule");

            migrationBuilder.DropColumn(
                name: "SeasonalTagsSeededOn",
                table: "FoodPlanSettings");

            migrationBuilder.DropColumn(
                name: "SuggestionExclusionWindowDays",
                table: "FoodPlanSettings");

            migrationBuilder.DropColumn(
                name: "SuggestionFavoritesWeight",
                table: "FoodPlanSettings");

            migrationBuilder.DropColumn(
                name: "SuggestionRotationSaturationDays",
                table: "FoodPlanSettings");

            migrationBuilder.DropColumn(
                name: "SuggestionRotationWeight",
                table: "FoodPlanSettings");

            migrationBuilder.DropColumn(
                name: "SuggestionSeasonalityWeight",
                table: "FoodPlanSettings");

            migrationBuilder.DropColumn(
                name: "SuggestionSeasonalityWindowDays",
                table: "FoodPlanSettings");
        }
    }
}
