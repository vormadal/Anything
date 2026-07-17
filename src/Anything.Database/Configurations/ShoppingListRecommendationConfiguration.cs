using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class ShoppingListRecommendationConfiguration : IEntityTypeConfiguration<ShoppingListRecommendation>
{
    public void Configure(EntityTypeBuilder<ShoppingListRecommendation> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.Property(e => e.PreferredUnit).HasMaxLength(50);
        builder.Property(e => e.IncludeInSuggestions).HasDefaultValue(true);
        // Uniqueness is per (household, list, name), scoped by two partial indexes rather than
        // a single NULLS NOT DISTINCT index (PG15+ only, and the e2e/production Postgres may be
        // older): one enforces uniqueness among list-specific rows, the other among shared
        // (null-list) rows per household. Together they keep a shared name unique per household
        // while still letting one shared row and one per-list row coexist for the same name.
        builder.HasIndex(e => new { e.HouseholdId, e.ShoppingListId, e.Name })
            .IsUnique()
            .HasDatabaseName("IX_ShoppingListRecommendations_HouseholdId_ShoppingListId_Name")
            .HasFilter("\"ShoppingListId\" IS NOT NULL");
        builder.HasIndex(e => new { e.HouseholdId, e.Name })
            .IsUnique()
            .HasDatabaseName("IX_ShoppingListRecommendations_HouseholdId_Name_Shared")
            .HasFilter("\"ShoppingListId\" IS NULL");
        // Speeds up the per-list filter/delete queries.
        builder.HasIndex(e => e.ShoppingListId);
        // GIN trigram index powering fuzzy (similarity) name search.
        builder.HasIndex(e => e.Name).HasMethod("gin").HasOperators("gin_trgm_ops");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        // Deleting a list removes its list-specific suggestions; shared (null) ones are unaffected.
        builder.HasOne(e => e.ShoppingList)
            .WithMany()
            .HasForeignKey(e => e.ShoppingListId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(e => e.Category)
            .WithMany()
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
