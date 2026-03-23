using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;

namespace Anything.Application.Features.Recipes.Commands;

public record CreateRecipeCommand(string Name, string? Link, string? Notes, int? CookTimeMinutes, int? Servings, ServingsType ServingsType) : IRequest<Recipe>;

public class CreateRecipeHandler(IRepository<Recipe> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<CreateRecipeCommand, Recipe>
{
    public async Task<Recipe> Handle(CreateRecipeCommand command, CancellationToken ct = default)
    {
        var recipe = new Recipe
        {
            Name = command.Name,
            Link = command.Link,
            Notes = command.Notes,
            CookTimeMinutes = command.CookTimeMinutes,
            Servings = command.Servings,
            ServingsType = command.ServingsType,
            CreatedOn = timeProvider.GetUtcNow().UtcDateTime
        };

        repository.Add(recipe);
        await unitOfWork.SaveChanges(ct);
        return recipe;
    }
}
