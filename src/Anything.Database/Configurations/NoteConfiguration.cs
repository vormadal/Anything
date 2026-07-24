using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Title).IsRequired().HasMaxLength(200);
        // GIN trigram index powering fuzzy (similarity) title search, matching Recipe.
        builder.HasIndex(e => e.Title).HasMethod("gin").HasOperators("gin_trgm_ops");
        builder.HasOne<Household>()
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
        // The editor document and its flattened projection are both unbounded
        // prose — no HasMaxLength, so Postgres stores them as text.
        builder.Property(e => e.ContentJson);
        builder.Property(e => e.ContentText);
    }
}
