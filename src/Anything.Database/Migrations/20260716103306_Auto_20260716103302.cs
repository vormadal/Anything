using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class Auto_20260716103302 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.AddColumn<int>(
                name: "ShoppingListId",
                table: "ShoppingListRecommendations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_ShoppingListId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "ShoppingListId", "Name" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_ShoppingListId",
                table: "ShoppingListRecommendations",
                column: "ShoppingListId");

            migrationBuilder.AddForeignKey(
                name: "FK_ShoppingListRecommendations_ShoppingLists_ShoppingListId",
                table: "ShoppingListRecommendations",
                column: "ShoppingListId",
                principalTable: "ShoppingLists",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShoppingListRecommendations_ShoppingLists_ShoppingListId",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_ShoppingListId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_ShoppingListId",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropColumn(
                name: "ShoppingListId",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "Name" },
                unique: true);
        }
    }
}
