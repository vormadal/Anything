using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAutoRenewAndFoodPlanId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropColumn(
                name: "FoodPlanId",
                table: "FoodPlanEntries");

            migrationBuilder.DropColumn(
                name: "AutoRenew",
                table: "FoodPlans");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoRenew",
                table: "FoodPlans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "FoodPlanId",
                table: "FoodPlanEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanEntries_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_FoodPlanEntries_FoodPlans_FoodPlanId",
                table: "FoodPlanEntries",
                column: "FoodPlanId",
                principalTable: "FoodPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
