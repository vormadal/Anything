using System.ComponentModel.DataAnnotations;

namespace Anything.Contracts.Bills;

public record UpdateBillAttachmentRequest(
    [Required, MaxLength(200)] string Name);
