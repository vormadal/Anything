using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RecipeTagConfiguration : IEntityTypeConfiguration<RecipeTag>
{
    public void Configure(EntityTypeBuilder<RecipeTag> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(50);
        // GIN trigram index powering fuzzy (similarity) name search.
        builder.HasIndex(e => e.Name).HasMethod("gin").HasOperators("gin_trgm_ops");
        builder.HasOne<Recipe>()
            .WithMany()
            .HasForeignKey(e => e.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
