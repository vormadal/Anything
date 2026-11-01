using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RenovationPurchaseAllocationConfiguration : IEntityTypeConfiguration<RenovationPurchaseAllocation>
{
    public void Configure(EntityTypeBuilder<RenovationPurchaseAllocation> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Quantity).HasColumnType("decimal(18,2)");
        builder.Property(e => e.Amount).HasColumnType("decimal(18,2)");
        builder.HasOne<RenovationPurchase>()
            .WithMany()
            .HasForeignKey(e => e.PurchaseId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<RenovationLine>()
            .WithMany()
            .HasForeignKey(e => e.LineId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
