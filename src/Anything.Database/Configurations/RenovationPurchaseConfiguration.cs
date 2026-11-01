using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RenovationPurchaseConfiguration : IEntityTypeConfiguration<RenovationPurchase>
{
    public void Configure(EntityTypeBuilder<RenovationPurchase> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Vendor).HasMaxLength(200);
        builder.Property(e => e.PurchasedOn).HasColumnType("date");
        builder.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
        builder.Property(e => e.Notes).HasMaxLength(1000);
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<RenovationProject>()
            .WithMany()
            .HasForeignKey(e => e.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Vendor>()
            .WithMany()
            .HasForeignKey(e => e.VendorId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
