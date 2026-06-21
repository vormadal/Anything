using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RecipeShareTokenConfiguration : IEntityTypeConfiguration<RecipeShareToken>
{
    public void Configure(EntityTypeBuilder<RecipeShareToken> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Token).IsRequired().HasMaxLength(500);
        builder.HasIndex(e => e.Token).IsUnique();
        builder.Property(e => e.TargetEmail).HasMaxLength(255);

        builder.HasOne(e => e.Recipe)
            .WithMany()
            .HasForeignKey(e => e.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
