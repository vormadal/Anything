using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class ImproveFoodPlanEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MealType",
                table: "FoodPlanEntries");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "FoodPlanEntries",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"FoodPlanEntries\" SET \"Name\" = COALESCE(\"CustomName\", 'Unnamed') WHERE \"Name\" IS NULL");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "FoodPlanEntries",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "CustomName",
                table: "FoodPlanEntries");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomName",
                table: "FoodPlanEntries",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"FoodPlanEntries\" SET \"CustomName\" = \"Name\"");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "FoodPlanEntries");

            migrationBuilder.AddColumn<string>(
                name: "MealType",
                table: "FoodPlanEntries",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }
    }
}
