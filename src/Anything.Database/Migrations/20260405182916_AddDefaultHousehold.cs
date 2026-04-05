using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddDefaultHousehold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create a default household if none exist, making the admin user the owner
            // and all other non-deleted users members. This handles existing deployments.
            migrationBuilder.Sql(@"
DO $$
DECLARE
    v_household_id INTEGER;
    v_admin_id INTEGER;
BEGIN
    -- Only seed if no households exist yet
    IF NOT EXISTS (SELECT 1 FROM ""Households"") THEN
        -- Find the admin user
        SELECT ""Id"" INTO v_admin_id
        FROM ""Users""
        WHERE ""Role"" = 'Admin' AND ""DeletedOn"" IS NULL
        LIMIT 1;

        IF v_admin_id IS NOT NULL THEN
            -- Create the default household
            INSERT INTO ""Households"" (""Name"", ""CreatedOn"")
            VALUES ('Default', NOW() AT TIME ZONE 'UTC')
            RETURNING ""Id"" INTO v_household_id;

            -- Add admin as owner
            INSERT INTO ""HouseholdMembers"" (""HouseholdId"", ""UserId"", ""Role"", ""JoinedOn"")
            VALUES (v_household_id, v_admin_id, 'Owner', NOW() AT TIME ZONE 'UTC');

            -- Add all other non-deleted users as members
            INSERT INTO ""HouseholdMembers"" (""HouseholdId"", ""UserId"", ""Role"", ""JoinedOn"")
            SELECT v_household_id, ""Id"", 'Member', NOW() AT TIME ZONE 'UTC'
            FROM ""Users""
            WHERE ""DeletedOn"" IS NULL AND ""Id"" != v_admin_id;
        END IF;
    END IF;
END $$;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only migration; no structural changes to reverse.
        }
    }
}
