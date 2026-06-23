using System.Security.Claims;
using Anything.Application.Services;
using Anything.Core.Entities;
using Anything.Core.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Anything.API.Middleware;

public class HouseholdMiddleware(RequestDelegate next)
{
    private const string HouseholdIdHeader = "X-Household-Id";

    private static readonly string[] ExemptPrefixes =
    [
        "/api/auth",
        "/api/households",
        "/api/events",
        "/api/shared",
        "/swagger"
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        if (IsExemptPath(context.Request.Path))
        {
            await next(context);
            return;
        }

        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            await next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(HouseholdIdHeader, out var headerValue)
            || !int.TryParse(headerValue, out var householdId))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { error = $"Missing or invalid {HouseholdIdHeader} header." });
            return;
        }

        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !int.TryParse(userIdClaim, out var userId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var memberRepository = context.RequestServices.GetRequiredService<IRepository<HouseholdMember>>();
        var householdRepository = context.RequestServices.GetRequiredService<IRepository<Household>>();

        var isActiveMember = await memberRepository.Query()
            .Join(
                householdRepository.Query().Where(h => h.DeletedOn == null),
                m => m.HouseholdId,
                h => h.Id,
                (m, h) => m)
            .Where(m => m.HouseholdId == householdId && m.UserId == userId)
            .AnyAsync(context.RequestAborted);

        if (!isActiveMember)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "You are not a member of this household." });
            return;
        }

        var householdContext = context.RequestServices.GetRequiredService<HouseholdContext>();
        householdContext.HouseholdId = householdId;

        await next(context);
    }

    private static bool IsExemptPath(PathString path)
    {
        foreach (var prefix in ExemptPrefixes)
        {
            if (path.StartsWithSegments(prefix))
                return true;
        }

        return false;
    }
}
