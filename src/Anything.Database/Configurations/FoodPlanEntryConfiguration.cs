using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class FoodPlanEntryConfiguration : IEntityTypeConfiguration<FoodPlanEntry>
{
    public void Configure(EntityTypeBuilder<FoodPlanEntry> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.HasOne<FoodPlan>()
            .WithMany()
            .HasForeignKey(e => e.FoodPlanId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Recipe>()
            .WithMany()
            .HasForeignKey(e => e.RecipeId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
