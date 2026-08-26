using Anything.Core.Entities;
using Anything.Core.Search;
using Microsoft.EntityFrameworkCore;

namespace Anything.Database;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Household> Households => Set<Household>();
    public DbSet<HouseholdMember> HouseholdMembers => Set<HouseholdMember>();
    public DbSet<Something> Somethings => Set<Something>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<UserInvite> UserInvites => Set<UserInvite>();
    public DbSet<InventoryStorageUnit> InventoryStorageUnits => Set<InventoryStorageUnit>();
    public DbSet<InventoryBox> InventoryBoxes => Set<InventoryBox>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryItemField> InventoryItemFields => Set<InventoryItemField>();
    public DbSet<InventoryAttachment> InventoryAttachments => Set<InventoryAttachment>();
    public DbSet<ShoppingList> ShoppingLists => Set<ShoppingList>();
    public DbSet<ShoppingListItem> ShoppingListItems => Set<ShoppingListItem>();
    public DbSet<ShoppingListRecommendation> ShoppingListRecommendations => Set<ShoppingListRecommendation>();
    public DbSet<SuggestionCategory> SuggestionCategories => Set<SuggestionCategory>();
    public DbSet<MeasurementUnit> MeasurementUnits => Set<MeasurementUnit>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
    public DbSet<RecipeStep> RecipeSteps => Set<RecipeStep>();
    public DbSet<RecipeImage> RecipeImages => Set<RecipeImage>();
    public DbSet<RecipeTag> RecipeTags => Set<RecipeTag>();
    public DbSet<RecipeShareToken> RecipeShareTokens => Set<RecipeShareToken>();
    public DbSet<FoodPlanEntry> FoodPlanEntries => Set<FoodPlanEntry>();
    public DbSet<FoodPlanNote> FoodPlanNotes => Set<FoodPlanNote>();
    public DbSet<FoodPlanSettings> FoodPlanSettings => Set<FoodPlanSettings>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<BillPriceHistory> BillPriceHistories => Set<BillPriceHistory>();
    public DbSet<BillAttachment> BillAttachments => Set<BillAttachment>();
    public DbSet<HomeCardPreference> HomeCardPreferences => Set<HomeCardPreference>();
    public DbSet<SearchDocument> SearchDocuments => Set<SearchDocument>();
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Enables trigram similarity (similarity(), % operator) used for fuzzy,
        // typo-tolerant name search. Backed by GIN trigram indexes declared on the
        // searched name columns in their entity configurations.
        modelBuilder.HasPostgresExtension("pg_trgm");
        // Map the pg_trgm word_similarity() function so it can be used for
        // relevance-ranked, typo-tolerant name search inside LINQ queries.
        modelBuilder.HasDbFunction(
            typeof(PgTrigramFunctions).GetMethod(
                nameof(PgTrigramFunctions.WordSimilarity),
                [typeof(string), typeof(string)])!)
            .HasName("word_similarity");
        // Map the pg_trgm similarity() function for symmetric, pairwise name
        // comparison — used to detect near-duplicate recommendations to merge.
        modelBuilder.HasDbFunction(
            typeof(PgTrigramFunctions).GetMethod(
                nameof(PgTrigramFunctions.Similarity),
                [typeof(string), typeof(string)])!)
            .HasName("similarity");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
