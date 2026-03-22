using Anything.Core.Entities;
using Anything.Core.Repositories;
using Anything.Mediator;
using Microsoft.AspNetCore.Http;

namespace Anything.Application.Features.SuggestionCategories.Commands;

public record DeleteSuggestionCategoryCommand(int Id) : IRequest<IResult>;

public class DeleteSuggestionCategoryHandler(IRepository<SuggestionCategory> repository, IUnitOfWork unitOfWork, TimeProvider timeProvider)
    : IRequestHandler<DeleteSuggestionCategoryCommand, IResult>
{
    private const string CategoryNotFound = "Category not found.";

    public async Task<IResult> Handle(DeleteSuggestionCategoryCommand command, CancellationToken ct = default)
    {
        var category = await repository.GetById(command.Id);
        if (category is null || category.DeletedOn != null)
            return Results.NotFound(CategoryNotFound);

        category.DeletedOn = timeProvider.GetUtcNow().UtcDateTime;
        await unitOfWork.SaveChanges(ct);
        return Results.NoContent();
    }
}
