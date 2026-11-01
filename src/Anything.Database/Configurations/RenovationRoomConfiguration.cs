using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class RenovationRoomConfiguration : IEntityTypeConfiguration<RenovationRoom>
{
    public void Configure(EntityTypeBuilder<RenovationRoom> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.Property(e => e.RoomType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Length).HasColumnType("decimal(9,2)");
        builder.Property(e => e.Width).HasColumnType("decimal(9,2)");
        builder.Property(e => e.Height).HasColumnType("decimal(9,2)");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<RenovationProject>()
            .WithMany()
            .HasForeignKey(e => e.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
