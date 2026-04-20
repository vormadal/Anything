using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddHouseholdIdToEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SuggestionCategories_Name",
                table: "SuggestionCategories");

            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanNotes_Date",
                table: "FoodPlanNotes");

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "Vendors",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "SuggestionCategories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "Somethings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "ShoppingLists",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "ShoppingListRecommendations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "Recipes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "Locations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "InventoryStorageUnits",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "InventoryItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "InventoryBoxes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "FoodPlanSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "FoodPlanNotes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "FoodPlanEntries",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HouseholdId",
                table: "Bills",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Populate HouseholdId for any existing rows from the household with the most members
            // (falls back to lowest Id). If rows exist but no active household exists, abort.
            migrationBuilder.Sql(@"
DO $$
DECLARE
    v_household_id INTEGER;
    v_has_rows BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM ""Somethings"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""Recipes"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""Bills"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""ShoppingLists"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""ShoppingListRecommendations"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""SuggestionCategories"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""FoodPlanEntries"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""FoodPlanNotes"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""FoodPlanSettings"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""Locations"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""Vendors"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""InventoryStorageUnits"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""InventoryBoxes"" WHERE ""HouseholdId"" = 0
        UNION ALL SELECT 1 FROM ""InventoryItems"" WHERE ""HouseholdId"" = 0
    ) INTO v_has_rows;

    IF v_has_rows THEN
        SELECT h.""Id"" INTO v_household_id
        FROM ""Households"" h
        WHERE h.""DeletedOn"" IS NULL
        ORDER BY (SELECT COUNT(*) FROM ""HouseholdMembers"" m WHERE m.""HouseholdId"" = h.""Id"") DESC, h.""Id"" ASC
        LIMIT 1;

        IF v_household_id IS NOT NULL THEN
            UPDATE ""Somethings"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""Recipes"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""Bills"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""ShoppingLists"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""ShoppingListRecommendations"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""SuggestionCategories"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""FoodPlanEntries"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""FoodPlanNotes"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""FoodPlanSettings"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""Locations"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""Vendors"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""InventoryStorageUnits"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""InventoryBoxes"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
            UPDATE ""InventoryItems"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" = 0;
        ELSE
            -- No active household exists (e.g. fresh install where admin is seeded after migrations).
            -- Delete orphaned seed/config rows — they will be re-created at runtime once a household exists.
            DELETE FROM ""FoodPlanSettings"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""FoodPlanNotes"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""FoodPlanEntries"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""SuggestionCategories"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""ShoppingListRecommendations"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""Somethings"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""Recipes"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""Bills"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""ShoppingLists"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""Locations"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""Vendors"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""InventoryStorageUnits"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""InventoryBoxes"" WHERE ""HouseholdId"" = 0;
            DELETE FROM ""InventoryItems"" WHERE ""HouseholdId"" = 0;
        END IF;
    END IF;
END $$;
");

            migrationBuilder.CreateIndex(
                name: "IX_Vendors_HouseholdId",
                table: "Vendors",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestionCategories_HouseholdId_Name",
                table: "SuggestionCategories",
                columns: new[] { "HouseholdId", "Name" },
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Somethings_HouseholdId",
                table: "Somethings",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingLists_HouseholdId",
                table: "ShoppingLists",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "Name" },
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Recipes_HouseholdId",
                table: "Recipes",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_HouseholdId",
                table: "Locations",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryStorageUnits_HouseholdId",
                table: "InventoryStorageUnits",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_HouseholdId",
                table: "InventoryItems",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBoxes_HouseholdId",
                table: "InventoryBoxes",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanSettings_HouseholdId",
                table: "FoodPlanSettings",
                column: "HouseholdId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanNotes_HouseholdId_Date",
                table: "FoodPlanNotes",
                columns: new[] { "HouseholdId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanEntries_HouseholdId",
                table: "FoodPlanEntries",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_Bills_HouseholdId",
                table: "Bills",
                column: "HouseholdId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bills_Households_HouseholdId",
                table: "Bills",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FoodPlanEntries_Households_HouseholdId",
                table: "FoodPlanEntries",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FoodPlanNotes_Households_HouseholdId",
                table: "FoodPlanNotes",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FoodPlanSettings_Households_HouseholdId",
                table: "FoodPlanSettings",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryBoxes_Households_HouseholdId",
                table: "InventoryBoxes",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_Households_HouseholdId",
                table: "InventoryItems",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryStorageUnits_Households_HouseholdId",
                table: "InventoryStorageUnits",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Locations_Households_HouseholdId",
                table: "Locations",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Recipes_Households_HouseholdId",
                table: "Recipes",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ShoppingListRecommendations_Households_HouseholdId",
                table: "ShoppingListRecommendations",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ShoppingLists_Households_HouseholdId",
                table: "ShoppingLists",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Somethings_Households_HouseholdId",
                table: "Somethings",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SuggestionCategories_Households_HouseholdId",
                table: "SuggestionCategories",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Vendors_Households_HouseholdId",
                table: "Vendors",
                column: "HouseholdId",
                principalTable: "Households",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bills_Households_HouseholdId",
                table: "Bills");

            migrationBuilder.DropForeignKey(
                name: "FK_FoodPlanEntries_Households_HouseholdId",
                table: "FoodPlanEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_FoodPlanNotes_Households_HouseholdId",
                table: "FoodPlanNotes");

            migrationBuilder.DropForeignKey(
                name: "FK_FoodPlanSettings_Households_HouseholdId",
                table: "FoodPlanSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryBoxes_Households_HouseholdId",
                table: "InventoryBoxes");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_Households_HouseholdId",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryStorageUnits_Households_HouseholdId",
                table: "InventoryStorageUnits");

            migrationBuilder.DropForeignKey(
                name: "FK_Locations_Households_HouseholdId",
                table: "Locations");

            migrationBuilder.DropForeignKey(
                name: "FK_Recipes_Households_HouseholdId",
                table: "Recipes");

            migrationBuilder.DropForeignKey(
                name: "FK_ShoppingListRecommendations_Households_HouseholdId",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropForeignKey(
                name: "FK_ShoppingLists_Households_HouseholdId",
                table: "ShoppingLists");

            migrationBuilder.DropForeignKey(
                name: "FK_Somethings_Households_HouseholdId",
                table: "Somethings");

            migrationBuilder.DropForeignKey(
                name: "FK_SuggestionCategories_Households_HouseholdId",
                table: "SuggestionCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_Vendors_Households_HouseholdId",
                table: "Vendors");

            migrationBuilder.DropIndex(
                name: "IX_Vendors_HouseholdId",
                table: "Vendors");

            migrationBuilder.DropIndex(
                name: "IX_SuggestionCategories_HouseholdId_Name",
                table: "SuggestionCategories");

            migrationBuilder.DropIndex(
                name: "IX_Somethings_HouseholdId",
                table: "Somethings");

            migrationBuilder.DropIndex(
                name: "IX_ShoppingLists_HouseholdId",
                table: "ShoppingLists");

            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropIndex(
                name: "IX_Recipes_HouseholdId",
                table: "Recipes");

            migrationBuilder.DropIndex(
                name: "IX_Locations_HouseholdId",
                table: "Locations");

            migrationBuilder.DropIndex(
                name: "IX_InventoryStorageUnits_HouseholdId",
                table: "InventoryStorageUnits");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_HouseholdId",
                table: "InventoryItems");

            migrationBuilder.DropIndex(
                name: "IX_InventoryBoxes_HouseholdId",
                table: "InventoryBoxes");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanSettings_HouseholdId",
                table: "FoodPlanSettings");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanNotes_HouseholdId_Date",
                table: "FoodPlanNotes");

            migrationBuilder.DropIndex(
                name: "IX_FoodPlanEntries_HouseholdId",
                table: "FoodPlanEntries");

            migrationBuilder.DropIndex(
                name: "IX_Bills_HouseholdId",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Vendors");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "SuggestionCategories");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Somethings");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "ShoppingLists");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "ShoppingListRecommendations");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "InventoryStorageUnits");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "InventoryBoxes");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "FoodPlanSettings");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "FoodPlanNotes");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "FoodPlanEntries");

            migrationBuilder.DropColumn(
                name: "HouseholdId",
                table: "Bills");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestionCategories_Name",
                table: "SuggestionCategories",
                column: "Name",
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations",
                column: "Name",
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanNotes_Date",
                table: "FoodPlanNotes",
                column: "Date",
                unique: true);
        }
    }
}
