using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class InventoryAttachmentConfiguration : IEntityTypeConfiguration<InventoryAttachment>
{
    private const int StorageKeyMaxLength = 500;
    private const int NameMaxLength = 200;
    private const int ContentTypeMaxLength = 100;
    private const int KindMaxLength = 20;

    public void Configure(EntityTypeBuilder<InventoryAttachment> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.StorageKey).IsRequired().HasMaxLength(StorageKeyMaxLength);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(NameMaxLength);
        builder.Property(e => e.ContentType).IsRequired().HasMaxLength(ContentTypeMaxLength);
        builder.Property(e => e.Kind).IsRequired().HasMaxLength(KindMaxLength);
        builder.HasOne<InventoryItem>()
            .WithMany()
            .HasForeignKey(e => e.ItemId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);
        builder.HasOne<InventoryBox>()
            .WithMany()
            .HasForeignKey(e => e.BoxId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);
        builder.HasOne<InventoryStorageUnit>()
            .WithMany()
            .HasForeignKey(e => e.StorageUnitId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired(false);
    }
}
