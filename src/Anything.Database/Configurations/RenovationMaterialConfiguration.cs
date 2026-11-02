using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RenovationMaterialConfiguration : IEntityTypeConfiguration<RenovationMaterial>
{
    public void Configure(EntityTypeBuilder<RenovationMaterial> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Category).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Unit).IsRequired().HasMaxLength(20);
        builder.Property(e => e.DefaultPrice).HasColumnType("decimal(18,2)");
        builder.Property(e => e.WastePercent).HasColumnType("decimal(5,2)");
        builder.Property(e => e.PackSize).HasColumnType("decimal(18,2)");
        builder.Property(e => e.ProductUrl).HasMaxLength(500);
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
