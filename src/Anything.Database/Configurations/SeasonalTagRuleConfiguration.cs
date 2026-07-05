using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class SeasonalTagRuleConfiguration : IEntityTypeConfiguration<SeasonalTagRule>
{
    public void Configure(EntityTypeBuilder<SeasonalTagRule> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Keyword).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => e.HouseholdId);
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
