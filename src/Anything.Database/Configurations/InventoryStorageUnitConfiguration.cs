using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class InventoryStorageUnitConfiguration : IEntityTypeConfiguration<InventoryStorageUnit>
{
    public void Configure(EntityTypeBuilder<InventoryStorageUnit> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Type).HasMaxLength(100);
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<InventoryStorageUnit>()
            .WithMany()
            .HasForeignKey(e => e.ParentId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}
