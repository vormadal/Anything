using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class HardDeleteEmptyShoppingListsAndRemoveCompletedOn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Hard delete shopping list items that were marked as completed
            migrationBuilder.Sql(
                @"DELETE FROM ""ShoppingListItems"" WHERE ""CompletedOn"" IS NOT NULL;");

            // Hard delete shopping lists that were soft-deleted (and their items via CASCADE)
            migrationBuilder.Sql(
                @"DELETE FROM ""ShoppingLists"" WHERE ""DeletedOn"" IS NOT NULL;");

            migrationBuilder.DropColumn(
                name: "CompletedOn",
                table: "ShoppingListItems");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedOn",
                table: "ShoppingListItems",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
