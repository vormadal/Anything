using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class HardDeleteSoftDeletedShoppingLists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Hard delete shopping lists that were soft-deleted (and their items via CASCADE)
            migrationBuilder.Sql(
                @"DELETE FROM ""ShoppingLists"" WHERE ""DeletedOn"" IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: this migration permanently deletes soft-deleted shopping lists
            // (and cascaded child records), so the removed data cannot be restored.
        }
    }
}
