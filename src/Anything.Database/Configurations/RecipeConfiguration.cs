using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RecipeConfiguration : IEntityTypeConfiguration<Recipe>
{
    public void Configure(EntityTypeBuilder<Recipe> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        // GIN trigram index powering fuzzy (similarity) name search.
        builder.HasIndex(e => e.Name).HasMethod("gin").HasOperators("gin_trgm_ops");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Property(e => e.Link).HasMaxLength(500);
        builder.Property(e => e.Notes).HasMaxLength(5000);
        builder.Property(e => e.ServingsType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .HasDefaultValue(ServingsType.People);
    }
}
