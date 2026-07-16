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
        // Uniqueness is per (household, list, name). NULLS NOT DISTINCT keeps a shared
        // (null-list) name unique per household while still allowing one shared row and one
        // per-list row to coexist for the same name.
        builder.HasIndex(e => new { e.HouseholdId, e.ShoppingListId, e.Name }).IsUnique().AreNullsDistinct(false);
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
