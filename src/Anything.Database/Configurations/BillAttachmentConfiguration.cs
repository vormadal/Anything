using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class BillAttachmentConfiguration : IEntityTypeConfiguration<BillAttachment>
{
    private const int StorageKeyMaxLength = 500;
    private const int NameMaxLength = 200;
    private const int ContentTypeMaxLength = 100;

    public void Configure(EntityTypeBuilder<BillAttachment> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.StorageKey).IsRequired().HasMaxLength(StorageKeyMaxLength);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(NameMaxLength);
        builder.Property(e => e.ContentType).IsRequired().HasMaxLength(ContentTypeMaxLength);
        builder.HasOne<Bill>()
            .WithMany()
            .HasForeignKey(e => e.BillId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
