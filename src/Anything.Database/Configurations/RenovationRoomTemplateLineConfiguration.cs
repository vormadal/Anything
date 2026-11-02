using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RenovationRoomTemplateLineConfiguration : IEntityTypeConfiguration<RenovationRoomTemplateLine>
{
    public void Configure(EntityTypeBuilder<RenovationRoomTemplateLine> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Key).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Label).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Group).IsRequired().HasMaxLength(50);
        builder.Property(e => e.MaterialName).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Category).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Basis).IsRequired().HasConversion<string>().HasMaxLength(50);
        builder.Property(e => e.Unit).IsRequired().HasMaxLength(20);
        builder.Property(e => e.DefaultPrice).HasColumnType("decimal(18,2)");
        builder.Property(e => e.WastePercent).HasColumnType("decimal(5,2)");
        builder.Property(e => e.FixedQuantity).HasColumnType("decimal(18,2)");
        builder.HasOne<RenovationRoomTemplate>()
            .WithMany()
            .HasForeignKey(e => e.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
