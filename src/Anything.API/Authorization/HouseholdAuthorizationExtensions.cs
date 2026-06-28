using Anything.Core.Constants;
using Anything.Core.Services;

namespace Anything.API.Authorization;

public static class HouseholdAuthorizationExtensions
{
    /// <summary>
    /// Requires the authenticated user to be a manager (Owner or Admin) of the
    /// household resolved by <see cref="Anything.API.Middleware.HouseholdMiddleware"/>.
    /// The endpoint filter runs after the middleware, so the role is populated on
    /// <see cref="IHouseholdContext"/>.
    /// </summary>
    public static RouteHandlerBuilder RequireHouseholdManager(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(static async (context, next) =>
        {
            var householdContext = context.HttpContext.RequestServices.GetRequiredService<IHouseholdContext>();

            if (!HouseholdRoles.IsManager(householdContext.Role))
                return Results.Forbid();

            return await next(context);
        });
    }
}
