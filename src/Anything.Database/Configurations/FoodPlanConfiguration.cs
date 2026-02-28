using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class FoodPlanConfiguration : IEntityTypeConfiguration<FoodPlan>
{
    public void Configure(EntityTypeBuilder<FoodPlan> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
    }
}
