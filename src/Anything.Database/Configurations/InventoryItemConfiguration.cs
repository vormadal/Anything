using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    private const int NameMaxLength = 200;
    private const int DescriptionMaxLength = 1000;
    private const int BrandMaxLength = 100;
    private const int ModelMaxLength = 100;
    private const int SerialNumberMaxLength = 100;
    private const int NotesMaxLength = 1000;

    public void Configure(EntityTypeBuilder<InventoryItem> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(NameMaxLength);
        builder.Property(e => e.Description).HasMaxLength(DescriptionMaxLength);
        builder.Property(e => e.Brand).HasMaxLength(BrandMaxLength);
        builder.Property(e => e.Model).HasMaxLength(ModelMaxLength);
        builder.Property(e => e.SerialNumber).HasMaxLength(SerialNumberMaxLength);
        builder.Property(e => e.Notes).HasMaxLength(NotesMaxLength);
        builder.Property(e => e.PurchasePrice).HasColumnType("decimal(18,2)");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<InventoryBox>()
            .WithMany()
            .HasForeignKey(e => e.BoxId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
        builder.HasOne<InventoryStorageUnit>()
            .WithMany()
            .HasForeignKey(e => e.StorageUnitId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);
    }
}
