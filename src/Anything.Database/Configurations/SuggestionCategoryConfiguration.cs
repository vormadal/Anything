using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class SuggestionCategoryConfiguration : IEntityTypeConfiguration<SuggestionCategory>
{
    public void Configure(EntityTypeBuilder<SuggestionCategory> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.HasIndex(e => e.Name).IsUnique().HasFilter("\"DeletedOn\" IS NULL");
    }
}
