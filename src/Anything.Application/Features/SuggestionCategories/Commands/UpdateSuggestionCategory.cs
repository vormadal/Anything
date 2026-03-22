using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record UpdateSuggestionCategoryCommand(int Id, string Name) : IRequest<IResult>;

public class UpdateSuggestionCategoryHandler(IRepository<SuggestionCategory> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<UpdateSuggestionCategoryCommand, IResult>
{
    private const string CategoryNotFound = "Category not found.";

    public async Task<IResult> Handle(UpdateSuggestionCategoryCommand command, CancellationToken ct = default)
    {
        var category = await repository.GetById(command.Id);
        if (category is null || category.DeletedOn != null)
            return Results.NotFound(CategoryNotFound);

        category.Name = command.Name;
        category.ModifiedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
