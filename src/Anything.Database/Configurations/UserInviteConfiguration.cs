using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class UserInviteConfiguration : IEntityTypeConfiguration<UserInvite>
{
    public void Configure(EntityTypeBuilder<UserInvite> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Email).IsRequired().HasMaxLength(255);
        builder.Property(e => e.Token).IsRequired().HasMaxLength(500);
        builder.HasIndex(e => e.Token).IsUnique();
        builder.Property(e => e.ExpiresAt).IsRequired();
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
