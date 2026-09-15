using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class PushDeviceConfiguration : IEntityTypeConfiguration<PushDevice>
{
    public void Configure(EntityTypeBuilder<PushDevice> builder)
    {
        builder.HasKey(e => e.Id);
        // Push endpoints are long URLs; 1000 keeps a btree index comfortably
        // under Postgres' row-size limit while fitting every service in use.
        builder.Property(e => e.Endpoint).IsRequired().HasMaxLength(1000);
        builder.Property(e => e.P256dhKey).IsRequired().HasMaxLength(200);
        builder.Property(e => e.AuthKey).IsRequired().HasMaxLength(100);
        builder.Property(e => e.UserAgent).HasMaxLength(400);

        // The browser hands back the same endpoint when it re-subscribes, which
        // is what makes registration an upsert. Unique across users too: an
        // endpoint identifies a browser, and if it moved to a different account
        // the old owner must lose it rather than keep receiving.
        builder.HasIndex(e => e.Endpoint).IsUnique();
        builder.HasIndex(e => e.UserId);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
