using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class HomeCardPreferenceConfiguration : IEntityTypeConfiguration<HomeCardPreference>
{
    public void Configure(EntityTypeBuilder<HomeCardPreference> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.CardKey).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => new { e.HouseholdId, e.UserId, e.CardKey }).IsUnique();
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
