using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Anything.Database.Configurations;

public class ShoppingListItemConfiguration : IEntityTypeConfiguration<ShoppingListItem>
{
    public void Configure(EntityTypeBuilder<ShoppingListItem> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Unit).HasMaxLength(50);
        builder.Property(e => e.AddedByRecipe);
        builder.HasOne<ShoppingList>()
            .WithMany()
            .HasForeignKey(e => e.ShoppingListId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
