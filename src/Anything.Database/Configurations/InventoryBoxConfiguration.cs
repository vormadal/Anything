using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class InventoryBoxConfiguration : IEntityTypeConfiguration<InventoryBox>
{
    private const int LabelMaxLength = 200;
    private const int DescriptionMaxLength = 1000;

    public void Configure(EntityTypeBuilder<InventoryBox> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Number).IsRequired();
        builder.Property(e => e.Label).HasMaxLength(LabelMaxLength);
        builder.Property(e => e.Description).HasMaxLength(DescriptionMaxLength);
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
