using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RecipeImageConfiguration : IEntityTypeConfiguration<RecipeImage>
{
    private const int StorageKeyMaxLength = 1000;

    public void Configure(EntityTypeBuilder<RecipeImage> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.StorageKey).IsRequired().HasMaxLength(StorageKeyMaxLength);
        builder.HasOne<Recipe>()
            .WithMany()
            .HasForeignKey(e => e.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
