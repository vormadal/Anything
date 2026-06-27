using Anything.Core.Entities;
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
