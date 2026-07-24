using Anything.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NpgsqlTypes;

namespace Anything.Database.Configurations;

public class SearchDocumentConfiguration : IEntityTypeConfiguration<SearchDocument>
{
    // 'simple' performs no stemming: trigram similarity (WordSimilarity, below)
    // already covers typo/fuzzy matching, so the tsvector only needs to rank
    // multi-word/word-order matches, and 'simple' avoids stemming surprises on
    // food/product names (e.g. stemming "beans" to "bean").
    private const string SearchVectorSql = "to_tsvector('simple', \"Title\" || ' ' || \"Content\")";

    public void Configure(EntityTypeBuilder<SearchDocument> builder)
    {
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => new { e.EntityType, e.EntityId }).IsUnique();
        builder.HasIndex(e => e.HouseholdId);

        builder.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Title).IsRequired().HasMaxLength(SearchDocumentLimits.MaxTitleLength);
        builder.Property(e => e.Content).IsRequired().HasMaxLength(SearchDocumentLimits.MaxContentLength);

        // GIN trigram index powering fuzzy (word_similarity) fallback matching —
        // same pattern as RecipeConfiguration's Name index.
        builder.HasIndex(e => e.Content).HasMethod("gin").HasOperators("gin_trgm_ops");

        // Generated tsvector column: Postgres computes and maintains it, EF never
        // writes to it directly (computed columns are excluded from INSERT/UPDATE).
        // Queried via EF.Property<NpgsqlTsVector>(d, "SearchVector") since it has
        // no CLR property on SearchDocument.
        builder.Property<NpgsqlTsVector>("SearchVector")
            .HasComputedColumnSql(SearchVectorSql, stored: true);
        builder.HasIndex("SearchVector").HasMethod("gin");
    }
}
