using Anything.Contracts.Recipes;

namespace Anything.Application.Services;

public interface IRecipeParserService
{
    Task<ParsedRecipeResponse?> ParseFromUrl(string url, CancellationToken ct = default);
}
