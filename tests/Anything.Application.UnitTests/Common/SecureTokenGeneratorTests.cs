using Anything.Application.Common;
using Xunit;

namespace Anything.Application.UnitTests.Common;

public class SecureTokenGeneratorTests
{
    [Fact]
    public void GenerateHexToken_ReturnsDifferentTokensEachCall()
    {
        var token1 = SecureTokenGenerator.GenerateHexToken();
        var token2 = SecureTokenGenerator.GenerateHexToken();

        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void GenerateHexToken_DefaultLength_Returns64LowercaseHexChars()
    {
        var token = SecureTokenGenerator.GenerateHexToken();

        Assert.Equal(64, token.Length); // 32 bytes = 64 hex chars
        Assert.Matches("^[0-9a-f]+$", token);
    }

    [Theory]
    [InlineData(16)]
    [InlineData(8)]
    public void GenerateHexToken_CustomByteLength_ScalesHexLength(int byteLength)
    {
        var token = SecureTokenGenerator.GenerateHexToken(byteLength);

        Assert.Equal(byteLength * 2, token.Length);
    }
}
