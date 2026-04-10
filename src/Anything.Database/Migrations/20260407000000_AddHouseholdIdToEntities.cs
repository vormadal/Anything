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
            // Add HouseholdId (nullable) to all domain entities
            var tables = new[]
            {
                "Somethings", "Recipes", "Bills", "ShoppingLists",
                "ShoppingListRecommendations", "SuggestionCategories",
                "FoodPlanEntries", "FoodPlanNotes", "FoodPlanSettings",
                "Locations", "Vendors",
                "InventoryStorageUnits", "InventoryBoxes", "InventoryItems"
            };

            foreach (var table in tables)
            {
                migrationBuilder.AddColumn<int>(
                    name: "HouseholdId",
                    table: table,
                    type: "integer",
                    nullable: true);
            }

            // Populate HouseholdId from the default (lowest-id non-deleted) household.
            // If there are existing rows but no household, the migration aborts with an error.
            migrationBuilder.Sql(@"
DO $$
DECLARE
    v_household_id INTEGER;
    v_has_rows BOOLEAN := FALSE;
BEGIN
    -- Check if any of the domain tables have rows that need populating
    SELECT EXISTS(
        SELECT 1 FROM ""Somethings"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""Recipes"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""Bills"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""ShoppingLists"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""ShoppingListRecommendations"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""SuggestionCategories"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""FoodPlanEntries"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""FoodPlanNotes"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""FoodPlanSettings"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""Locations"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""Vendors"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""InventoryStorageUnits"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""InventoryBoxes"" WHERE ""HouseholdId"" IS NULL
        UNION ALL SELECT 1 FROM ""InventoryItems"" WHERE ""HouseholdId"" IS NULL
    ) INTO v_has_rows;

    IF v_has_rows THEN
        -- Pick the household with the most members; fall back to lowest Id
        SELECT h.""Id"" INTO v_household_id
        FROM ""Households"" h
        WHERE h.""DeletedOn"" IS NULL
        ORDER BY (SELECT COUNT(*) FROM ""HouseholdMembers"" m WHERE m.""HouseholdId"" = h.""Id"") DESC, h.""Id"" ASC
        LIMIT 1;

        IF v_household_id IS NULL THEN
            RAISE EXCEPTION 'Migration failed: existing data rows found but no active household exists to assign them to.';
        END IF;

        UPDATE ""Somethings"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""Recipes"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""Bills"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""ShoppingLists"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""ShoppingListRecommendations"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""SuggestionCategories"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""FoodPlanEntries"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""FoodPlanNotes"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""FoodPlanSettings"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""Locations"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""Vendors"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""InventoryStorageUnits"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""InventoryBoxes"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
        UPDATE ""InventoryItems"" SET ""HouseholdId"" = v_household_id WHERE ""HouseholdId"" IS NULL;
    END IF;
END $$;
");

            // Make HouseholdId non-nullable on all tables (no column-level default — NULL rows must already be populated above)
            foreach (var table in tables)
            {
                migrationBuilder.AlterColumn<int>(
                    name: "HouseholdId",
                    table: table,
                    type: "integer",
                    nullable: false,
                    oldClrType: typeof(int),
                    oldType: "integer",
                    oldNullable: true);
            }

            // Add foreign key constraints
            foreach (var table in tables)
            {
                migrationBuilder.AddForeignKey(
                    name: $"FK_{table}_Households_HouseholdId",
                    table: table,
                    column: "HouseholdId",
                    principalTable: "Households",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);

                migrationBuilder.CreateIndex(
                    name: $"IX_{table}_HouseholdId",
                    table: table,
                    column: "HouseholdId");
            }

            // Update the FoodPlanNotes unique index from (Date) to (HouseholdId, Date)
            migrationBuilder.DropIndex(
                name: "IX_FoodPlanNotes_Date",
                table: "FoodPlanNotes");

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanNotes_HouseholdId_Date",
                table: "FoodPlanNotes",
                columns: new[] { "HouseholdId", "Date" },
                unique: true);

            // Update SuggestionCategories unique index from (Name) to (HouseholdId, Name)
            migrationBuilder.DropIndex(
                name: "IX_SuggestionCategories_Name",
                table: "SuggestionCategories");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestionCategories_HouseholdId_Name",
                table: "SuggestionCategories",
                columns: new[] { "HouseholdId", "Name" },
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            // Update ShoppingListRecommendations unique index from (Name) to (HouseholdId, Name)
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations",
                columns: new[] { "HouseholdId", "Name" },
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            // Add unique constraint on FoodPlanSettings.HouseholdId (one settings row per household)
            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanSettings_HouseholdId_Unique",
                table: "FoodPlanSettings",
                column: "HouseholdId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            var tables = new[]
            {
                "Somethings", "Recipes", "Bills", "ShoppingLists",
                "ShoppingListRecommendations", "SuggestionCategories",
                "FoodPlanEntries", "FoodPlanNotes", "FoodPlanSettings",
                "Locations", "Vendors",
                "InventoryStorageUnits", "InventoryBoxes", "InventoryItems"
            };

            // Restore FoodPlanSettings unique index
            migrationBuilder.DropIndex(
                name: "IX_FoodPlanSettings_HouseholdId_Unique",
                table: "FoodPlanSettings");

            // Restore ShoppingListRecommendations unique index
            migrationBuilder.DropIndex(
                name: "IX_ShoppingListRecommendations_HouseholdId_Name",
                table: "ShoppingListRecommendations");

            migrationBuilder.CreateIndex(
                name: "IX_ShoppingListRecommendations_Name",
                table: "ShoppingListRecommendations",
                column: "Name",
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            // Restore SuggestionCategories unique index
            migrationBuilder.DropIndex(
                name: "IX_SuggestionCategories_HouseholdId_Name",
                table: "SuggestionCategories");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestionCategories_Name",
                table: "SuggestionCategories",
                column: "Name",
                unique: true,
                filter: "\"DeletedOn\" IS NULL");

            // Restore FoodPlanNotes unique index
            migrationBuilder.DropIndex(
                name: "IX_FoodPlanNotes_HouseholdId_Date",
                table: "FoodPlanNotes");

            migrationBuilder.CreateIndex(
                name: "IX_FoodPlanNotes_Date",
                table: "FoodPlanNotes",
                column: "Date",
                unique: true);

            foreach (var table in tables)
            {
                migrationBuilder.DropIndex(
                    name: $"IX_{table}_HouseholdId",
                    table: table);

                migrationBuilder.DropForeignKey(
                    name: $"FK_{table}_Households_HouseholdId",
                    table: table);

                migrationBuilder.DropColumn(
                    name: "HouseholdId",
                    table: table);
            }
        }
    }
}
