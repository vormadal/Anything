/**
 * File-picker `accept` value for attachment uploads (bills, inventory
 * documents). Mirrors the backend allowlist in
 * `Anything.Application.Common.UploadValidation` — keep the two in sync, since
 * the backend rejects anything outside it with a 400.
 */
export const ATTACHMENT_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
].join(",");
