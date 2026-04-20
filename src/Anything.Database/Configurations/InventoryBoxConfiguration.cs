using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class InventoryBoxConfiguration : IEntityTypeConfiguration<InventoryBox>
{
    public void Configure(EntityTypeBuilder<InventoryBox> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Number).IsRequired();
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<InventoryStorageUnit>()
            .WithMany()
            .HasForeignKey(e => e.StorageUnitId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);
    }
}
