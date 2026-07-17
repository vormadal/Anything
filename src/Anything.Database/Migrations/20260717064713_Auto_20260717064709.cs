using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class Auto_20260717064709 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_ShoppingListId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name_Shared",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "Name" },
                unique: true,
                filter: "\"ShoppingListId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_ShoppingListId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "ShoppingListId", "Name" },
                unique: true,
                filter: "\"ShoppingListId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name_Shared",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_ShoppingListId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_ShoppingListId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "ShoppingListId", "Name" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);
        }
    }
}
