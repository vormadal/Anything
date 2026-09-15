using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Category).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Title).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Body).HasMaxLength(2000);
        builder.Property(e => e.LinkUrl).HasMaxLength(500);
        builder.Property(e => e.SourceKey).HasMaxLength(200);

        // Covers both reads the inbox does: the recipient's newest-first list and
        // the unread badge count, which differ only in an extra ReadOn filter.
        builder.HasIndex(e => new { e.HouseholdId, e.UserId, e.CreatedOn });

        // Makes dispatch idempotent for anything carrying a SourceKey — a repeated
        // sweep hits this instead of duplicating a row. Rows with a null SourceKey
        // (one-off sends) are exempt: Postgres treats NULLs as distinct here.
        builder.HasIndex(e => new { e.UserId, e.Category, e.SourceKey }).IsUnique();

        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        // The sender is attribution only — losing them must not delete everyone
        // else's copy of what they sent, so this detaches instead of cascading.
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
