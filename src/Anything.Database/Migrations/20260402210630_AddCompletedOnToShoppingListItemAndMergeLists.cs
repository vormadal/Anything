using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddCompletedOnToShoppingListItemAndMergeLists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedOn",
                table: "ShoppingListItems",
                type: "timestamp with time zone",
                nullable: true);

            // Backfill CompletedOn for items that were already checked
            migrationBuilder.Sql(
                @"UPDATE ""ShoppingListItems""
                  SET ""CompletedOn"" = COALESCE(""ModifiedOn"", ""CreatedOn"")
                  WHERE ""IsChecked"" = true;");

            // Merge active shopping lists that share the same name.
            // Items from duplicate lists are moved to the primary list (lowest Id per name).
            // Duplicate lists are then soft-deleted.
            migrationBuilder.Sql(
                @"UPDATE ""ShoppingListItems"" si
                  SET ""ShoppingListId"" = primary_list.""Id"",
                      ""ModifiedOn"" = NOW()
                  FROM (
                      SELECT MIN(""Id"") AS ""Id"", ""Name""
                      FROM ""ShoppingLists""
                      WHERE ""DeletedOn"" IS NULL
                      GROUP BY ""Name""
                      HAVING COUNT(*) > 1
                  ) primary_list
                  JOIN ""ShoppingLists"" dup
                      ON dup.""Name"" = primary_list.""Name""
                      AND dup.""Id"" != primary_list.""Id""
                      AND dup.""DeletedOn"" IS NULL
                  WHERE si.""ShoppingListId"" = dup.""Id"";");

            migrationBuilder.Sql(
                @"UPDATE ""ShoppingLists""
                  SET ""DeletedOn"" = NOW()
                  WHERE ""DeletedOn"" IS NULL
                    AND ""Id"" NOT IN (
                        SELECT MIN(""Id"")
                        FROM ""ShoppingLists""
                        WHERE ""DeletedOn"" IS NULL
                        GROUP BY ""Name""
                    )
                    AND ""Name"" IN (
                        SELECT ""Name""
                        FROM ""ShoppingLists""
                        WHERE ""DeletedOn"" IS NULL
                        GROUP BY ""Name""
                        HAVING COUNT(*) > 1
                    );");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedOn",
                table: "ShoppingListItems");
        }
    }
}
