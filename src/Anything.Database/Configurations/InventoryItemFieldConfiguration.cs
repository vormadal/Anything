using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class InventoryItemFieldConfiguration : IEntityTypeConfiguration<InventoryItemField>
{
    private const int LabelMaxLength = 100;
    private const int ValueMaxLength = 500;

    public void Configure(EntityTypeBuilder<InventoryItemField> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Label).IsRequired().HasMaxLength(LabelMaxLength);
        builder.Property(e => e.Value).IsRequired().HasMaxLength(ValueMaxLength);
        builder.HasOne<InventoryItem>()
            .WithMany()
            .HasForeignKey(e => e.ItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
