using Anything.Application.Common;
using Anything.Core.Upload;
using Microsoft.AspNetCore.Http.HttpResults;
using Xunit;

namespace Anything.Application.UnitTests.Common;

public class UploadValidationTests
{
    [Fact]
    public void ValidateFileSize_WithinLimit_ReturnsNull() =>
        Assert.Null(UploadValidation.ValidateFileSize(1024));

    [Fact]
    public void ValidateFileSize_Empty_ReturnsBadRequest()
    {
        var result = Assert.IsType<BadRequest<string>>(UploadValidation.ValidateFileSize(0));
        Assert.Equal(UploadLimits.EmptyFileMessage, result.Value);
    }

    [Fact]
    public void ValidateFileSize_TooLarge_ReturnsBadRequest()
    {
        var result = Assert.IsType<BadRequest<string>>(
            UploadValidation.ValidateFileSize(UploadLimits.MaxFileSizeBytes + 1));
        Assert.Equal(UploadLimits.FileTooLargeMessage, result.Value);
    }

    [Theory]
    [InlineData("image/png")]
    [InlineData("image/jpeg")]
    [InlineData("image/webp")]
    [InlineData("image/gif")]
    [InlineData("IMAGE/PNG")]
    [InlineData("image/jpeg; charset=binary")]
    public void ValidateImageContentType_AllowsImages(string contentType) =>
        Assert.Null(UploadValidation.ValidateImageContentType(contentType));

    [Theory]
    [InlineData("application/pdf")]
    [InlineData("text/html")]
    [InlineData("image/svg+xml")]
    [InlineData("")]
    public void ValidateImageContentType_RejectsNonImages(string contentType)
    {
        var result = Assert.IsType<BadRequest<string>>(
            UploadValidation.ValidateImageContentType(contentType));
        Assert.Equal(UploadValidation.InvalidImageMessage, result.Value);
    }

    [Theory]
    [InlineData("image/png")]
    [InlineData("application/pdf")]
    [InlineData("text/plain")]
    [InlineData("application/msword")]
    [InlineData("application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    [InlineData("application/vnd.ms-excel")]
    [InlineData("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    [InlineData("application/pdf; charset=binary")]
    public void ValidateAttachmentContentType_AllowsImagesAndDocuments(string contentType) =>
        Assert.Null(UploadValidation.ValidateAttachmentContentType(contentType));

    [Theory]
    [InlineData("text/html")]
    [InlineData("image/svg+xml")]
    [InlineData("application/octet-stream")]
    [InlineData("application/x-msdownload")]
    [InlineData("")]
    public void ValidateAttachmentContentType_RejectsEverythingElse(string contentType)
    {
        var result = Assert.IsType<BadRequest<string>>(
            UploadValidation.ValidateAttachmentContentType(contentType));
        Assert.Equal(UploadValidation.InvalidAttachmentMessage, result.Value);
    }
}
