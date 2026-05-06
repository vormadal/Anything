using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRecommendationSoftDeleteAndApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropColumn(
                name: "DeletedOn",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropColumn(
                name: "IsApproved",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedOn",
                table: "ShoppingListRecommendations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsApproved",
                table: "ShoppingListRecommendations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "Name" },
                unique: true,
                filter: "\"DeletedOn\" IS NULL");
        }
    }
}
