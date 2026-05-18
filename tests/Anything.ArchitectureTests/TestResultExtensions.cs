using NetArchTest.Rules;
using Xunit.Sdk;

namespace Anything.ArchitectureTests;

internal static class TestResultExtensions
{
    public static void AssertSuccess(this TestResult result)
    {
        if (result.IsSuccessful)
            return;

        var failing = (result.FailingTypes ?? [])
            .Select(t => t.FullName ?? t.Name)
            .OrderBy(n => n);

        throw new XunitException(
            $"Architecture rule violated. Failing types:{Environment.NewLine}" +
            string.Join(Environment.NewLine, failing.Select(n => $"  - {n}")));
    }
}
