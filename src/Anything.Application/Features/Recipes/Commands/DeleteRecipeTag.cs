using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.Recipes.Commands;

public record DeleteRecipeTagCommand(int RecipeId, int TagId) : IRequest<IResult>;

public class DeleteRecipeTagHandler(
    IRepository<RecipeTag> repository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : IRequestHandler<DeleteRecipeTagCommand, IResult>
{
    private const string TagNotFound = "Tag not found.";

    public async Task<IResult> Handle(DeleteRecipeTagCommand command, CancellationToken ct = default)
    {
        var tag = await repository.GetById(command.TagId);
        if (tag is null || tag.DeletedOn != null || tag.RecipeId != command.RecipeId)
            return Results.NotFound(TagNotFound);

        tag.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
