using Anything.Application.Common;
using Xunit;

namespace Anything.Application.UnitTests.Common;

public class FuzzySearchTests
{
    [Theory]
    [InlineData("milk", "%milk%")]
    [InlineData("50%", @"%50\%%")]
    [InlineData("a_b", @"%a\_b%")]
    [InlineData(@"c:\x", @"%c:\\x%")]
    public void ContainsPattern_WrapsAndEscapesLikeWildcards(string normalized, string expected)
    {
        Assert.Equal(expected, FuzzySearch.ContainsPattern(normalized));
    }
}
