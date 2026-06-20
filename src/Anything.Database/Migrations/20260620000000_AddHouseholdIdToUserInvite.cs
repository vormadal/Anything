using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdIdToUserInvite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "UserInvites",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserInvites_HouseholdId",
                table: "UserInvites",
                column: "HouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserInvites_Households_HouseholdId",
                table: "UserInvites",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserInvites_Households_HouseholdId",
                table: "UserInvites");

            migrationBuilder.DropIndex(
                name: "IX_UserInvites_HouseholdId",
                table: "UserInvites");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "UserInvites");
        }
    }
}
