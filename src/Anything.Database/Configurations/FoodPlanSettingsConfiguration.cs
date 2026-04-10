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
        builder.HasIndex(e => e.HouseholdId).IsUnique();
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
