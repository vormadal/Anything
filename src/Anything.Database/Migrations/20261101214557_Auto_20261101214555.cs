using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Anything.Database.Migrations
{
    /// <inheritdoc />
    public partial class Auto_20261101214555 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RenovationMaterials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HouseholdId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DefaultPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    WastePercent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    PackSize = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ProductUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RenovationMaterials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RenovationMaterials_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RenovationProjects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HouseholdId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Budget = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RenovationProjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RenovationProjects_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RenovationPurchases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HouseholdId = table.Column<int>(type: "integer", nullable: false),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    Vendor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PurchasedOn = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RenovationPurchases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RenovationPurchases_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RenovationPurchases_RenovationProjects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "RenovationProjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RenovationRooms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HouseholdId = table.Column<int>(type: "integer", nullable: false),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RoomType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Length = table.Column<decimal>(type: "numeric(9,2)", nullable: false),
                    Width = table.Column<decimal>(type: "numeric(9,2)", nullable: false),
                    Height = table.Column<decimal>(type: "numeric(9,2)", nullable: false),
                    Doors = table.Column<int>(type: "integer", nullable: false),
                    Windows = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RenovationRooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RenovationRooms_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RenovationRooms_RenovationProjects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "RenovationProjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RenovationLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HouseholdId = table.Column<int>(type: "integer", nullable: false),
                    RoomId = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Group = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MaterialId = table.Column<int>(type: "integer", nullable: true),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Basis = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FixedQuantity = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    WastePercent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    IsComplete = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RenovationLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RenovationLines_Households_HouseholdId",
                        column: x => x.HouseholdId,
                        principalTable: "Households",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RenovationLines_RenovationMaterials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "RenovationMaterials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RenovationLines_RenovationRooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "RenovationRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RenovationPurchaseAllocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseId = table.Column<int>(type: "integer", nullable: false),
                    LineId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RenovationPurchaseAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RenovationPurchaseAllocations_RenovationLines_LineId",
                        column: x => x.LineId,
                        principalTable: "RenovationLines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RenovationPurchaseAllocations_RenovationPurchases_PurchaseId",
                        column: x => x.PurchaseId,
                        principalTable: "RenovationPurchases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RenovationLines_HouseholdId",
                table: "RenovationLines",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationLines_MaterialId",
                table: "RenovationLines",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationLines_RoomId",
                table: "RenovationLines",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationMaterials_HouseholdId",
                table: "RenovationMaterials",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationProjects_HouseholdId",
                table: "RenovationProjects",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationPurchaseAllocations_LineId",
                table: "RenovationPurchaseAllocations",
                column: "LineId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationPurchaseAllocations_PurchaseId",
                table: "RenovationPurchaseAllocations",
                column: "PurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationPurchases_HouseholdId",
                table: "RenovationPurchases",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationPurchases_ProjectId",
                table: "RenovationPurchases",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationRooms_HouseholdId",
                table: "RenovationRooms",
                column: "HouseholdId");

            migrationBuilder.CreateIndex(
                name: "IX_RenovationRooms_ProjectId",
                table: "RenovationRooms",
                column: "ProjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RenovationPurchaseAllocations");

            migrationBuilder.DropTable(
                name: "RenovationLines");

            migrationBuilder.DropTable(
                name: "RenovationPurchases");

            migrationBuilder.DropTable(
                name: "RenovationMaterials");

            migrationBuilder.DropTable(
                name: "RenovationRooms");

            migrationBuilder.DropTable(
                name: "RenovationProjects");
        }
    }
}
