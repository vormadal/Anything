using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class Auto_20260730112344 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParentId",
                table: "InventoryStorageUnits",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryStorageUnits_ParentId",
                table: "InventoryStorageUnits",
                column: "ParentId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryStorageUnits_InventoryStorageUnits_ParentId",
                table: "InventoryStorageUnits",
                column: "ParentId",
                principalTable: "InventoryStorageUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryStorageUnits_InventoryStorageUnits_ParentId",
                table: "InventoryStorageUnits");

            migrationBuilder.DropIndex(
                name: "IX_InventoryStorageUnits_ParentId",
                table: "InventoryStorageUnits");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "InventoryStorageUnits");
        }
    }
}
