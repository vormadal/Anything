using Anything.Application.Services;
using Anything.Contracts.Recipes;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record ParseRecipeFromTextCommand(string? Name, string? IngredientsText, string? StepsText) : IRequest<IResult>;

public class ParseRecipeFromTextHandler(IRecipeParserService parserService)
    : IRequestHandler<ParseRecipeFromTextCommand, IResult>
{
    private const string NoTextProvided = "At least one of Name, IngredientsText or StepsText must be provided.";

    public Task<IResult> Handle(ParseRecipeFromTextCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Name)
            && string.IsNullOrWhiteSpace(command.IngredientsText)
            && string.IsNullOrWhiteSpace(command.StepsText))
        {
            return Task.FromResult(Results.BadRequest(NoTextProvided));
        }

        var result = parserService.ParseFromText(command.Name, command.IngredientsText, command.StepsText);
        return Task.FromResult(Results.Ok(result));
    }
}
