using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class BillAmountEntryConfiguration : IEntityTypeConfiguration<BillAmountEntry>
{
    public void Configure(EntityTypeBuilder<BillAmountEntry> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Amount).IsRequired().HasColumnType("decimal(18,2)");
        builder.Property(e => e.Notes).HasMaxLength(500);

        builder.HasOne(e => e.Bill)
            .WithMany()
            .HasForeignKey(e => e.BillId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
