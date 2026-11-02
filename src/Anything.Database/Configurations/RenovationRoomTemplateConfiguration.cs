using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RenovationRoomTemplateConfiguration : IEntityTypeConfiguration<RenovationRoomTemplate>
{
    public void Configure(EntityTypeBuilder<RenovationRoomTemplate> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.RoomType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Label).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Length).HasColumnType("decimal(9,2)");
        builder.Property(e => e.Width).HasColumnType("decimal(9,2)");
        builder.Property(e => e.Height).HasColumnType("decimal(9,2)");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        // One live row per room type per household. Soft-deleted rows are excluded so that
        // deleting a customisation and saving it again creates a fresh row.
        builder.HasIndex(e => new { e.HouseholdId, e.RoomType })
            .IsUnique()
            .HasFilter("\"DeletedOn\" IS NULL");
    }
}
