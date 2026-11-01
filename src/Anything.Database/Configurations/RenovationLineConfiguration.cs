using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RenovationLineConfiguration : IEntityTypeConfiguration<RenovationLine>
{
    public void Configure(EntityTypeBuilder<RenovationLine> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Label).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Group).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Description).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Basis).IsRequired().HasConversion<string>().HasMaxLength(50);
        builder.Property(e => e.FixedQuantity).HasColumnType("decimal(18,2)");
        builder.Property(e => e.Unit).IsRequired().HasMaxLength(20);
        builder.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
        builder.Property(e => e.WastePercent).HasColumnType("decimal(5,2)");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<RenovationRoom>()
            .WithMany()
            .HasForeignKey(e => e.RoomId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<RenovationMaterial>()
            .WithMany()
            .HasForeignKey(e => e.MaterialId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
