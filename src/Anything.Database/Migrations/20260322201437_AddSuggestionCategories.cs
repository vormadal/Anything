using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddSuggestionCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CategoryId",
                table: "ShoppingListRecommendations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SuggestionCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestionCategories", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_CategoryId",
                table: "ShoppingListRecommendations",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestionCategories_Name",
                table: "SuggestionCategories",
                column: "Name",
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_ShoppingListRecommendations_SuggestionCategories_CategoryId",
                table: "ShoppingListRecommendations",
                column: "CategoryId",
                principalTable: "SuggestionCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShoppingListRecommendations_SuggestionCategories_CategoryId",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropTable(
                name: "SuggestionCategories");

            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_CategoryId",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "ShoppingListRecommendations");
        }
    }
}
