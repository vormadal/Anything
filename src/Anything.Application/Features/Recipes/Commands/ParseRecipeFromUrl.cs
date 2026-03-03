using Anything.Application.Services;
using Anything.Contracts.Recipes;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record ParseRecipeFromUrlCommand(string Url) : IRequest<IResult>;

public class ParseRecipeFromUrlHandler(IRecipeParserService parserService)
    : IRequestHandler<ParseRecipeFromUrlCommand, IResult>
{
    private const string NoRecipeFound = "No Schema.org recipe data found at the provided URL.";

    public async Task<IResult> Handle(ParseRecipeFromUrlCommand command, CancellationToken ct = default)
    {
        ParsedRecipeResponse? result;
        try
        {
            result = await parserService.ParseFromUrl(command.Url, ct);
        }
        catch (HttpRequestException)
        {
            return Results.BadRequest("Failed to fetch the provided URL.");
        }

        return result is null
            ? Results.UnprocessableEntity(NoRecipeFound)
            : Results.Ok(result);
    }
}
