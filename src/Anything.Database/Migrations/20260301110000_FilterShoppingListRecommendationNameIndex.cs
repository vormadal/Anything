using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class FilterShoppingListRecommendationNameIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations",
                column: "Name",
                unique: true,
                filter: "\"DeletedOn\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations",
                column: "Name",
                unique: true);
        }
    }
}
