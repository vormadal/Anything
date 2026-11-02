using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class Auto_20261101215845 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VendorId",
                table: "RenovationPurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InventoryItemId",
                table: "RenovationPurchaseAllocations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RenovationPurchases_VendorId",
                table: "RenovationPurchases",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationPurchaseAllocations_InventoryItemId",
                table: "RenovationPurchaseAllocations",
                column: "InventoryItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_RenovationPurchaseAllocations_InventoryItems_InventoryItemId",
                table: "RenovationPurchaseAllocations",
                column: "InventoryItemId",
                principalTable: "InventoryItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_RenovationPurchases_Vendors_VendorId",
                table: "RenovationPurchases",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RenovationPurchaseAllocations_InventoryItems_InventoryItemId",
                table: "RenovationPurchaseAllocations");

            migrationBuilder.DropForeignKey(
                name: "FK_RenovationPurchases_Vendors_VendorId",
                table: "RenovationPurchases");

            migrationBuilder.DropIndex(
                name: "IX_RenovationPurchases_VendorId",
                table: "RenovationPurchases");

            migrationBuilder.DropIndex(
                name: "IX_RenovationPurchaseAllocations_InventoryItemId",
                table: "RenovationPurchaseAllocations");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "RenovationPurchases");

            migrationBuilder.DropColumn(
                name: "InventoryItemId",
                table: "RenovationPurchaseAllocations");
        }
    }
}
