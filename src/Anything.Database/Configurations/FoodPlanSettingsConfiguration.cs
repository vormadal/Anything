using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class FoodPlanSettingsConfiguration : IEntityTypeConfiguration<FoodPlanSettings>
{
    public void Configure(EntityTypeBuilder<FoodPlanSettings> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.ActiveDays).HasDefaultValue(31);
        builder.Property(e => e.SuggestionRotationWeight).HasDefaultValue(40);
        builder.Property(e => e.SuggestionFavoritesWeight).HasDefaultValue(25);
        builder.Property(e => e.SuggestionSeasonalityWeight).HasDefaultValue(20);
        builder.Property(e => e.SuggestionExclusionWindowDays).HasDefaultValue(6);
        builder.Property(e => e.SuggestionRotationSaturationDays).HasDefaultValue(84);
        builder.Property(e => e.SuggestionSeasonalityWindowDays).HasDefaultValue(21);
        builder.HasIndex(e => e.HouseholdId).IsUnique();
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
