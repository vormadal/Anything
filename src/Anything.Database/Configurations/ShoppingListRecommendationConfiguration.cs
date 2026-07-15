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
        builder.HasIndex(e => new { e.HouseholdId, e.Name }).IsUnique();
        // GIN trigram index powering fuzzy (similarity) name search.
        builder.HasIndex(e => e.Name).HasMethod("gin").HasOperators("gin_trgm_ops");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(e => e.Category)
            .WithMany()
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
