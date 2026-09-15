using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class NotificationPreferenceConfiguration : IEntityTypeConfiguration<NotificationPreference>
{
    public void Configure(EntityTypeBuilder<NotificationPreference> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Category).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => new { e.HouseholdId, e.UserId, e.Category }).IsUnique();
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
