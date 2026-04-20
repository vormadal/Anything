using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class FoodPlanNoteConfiguration : IEntityTypeConfiguration<FoodPlanNote>
{
    public void Configure(EntityTypeBuilder<FoodPlanNote> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Note).IsRequired().HasMaxLength(500);
        builder.Property(n => n.Date).HasColumnType("date");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(n => n.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(n => new { n.HouseholdId, n.Date }).IsUnique();
    }
}
