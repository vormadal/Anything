namespace Anything.Contracts.Notes;

/// <summary>
/// Shared field limits for the note create/update request contracts.
/// </summary>
/// <remarks>
/// Raised from the original 100 000 to make room for notes imported from
/// external sources (e.g. Samsung Notes), which tend to be longer than a note
/// authored in this app. The database column itself is unbounded <c>text</c>,
/// so this is purely a DTO-level guard against unreasonably large payloads.
/// </remarks>
internal static class NoteContractLimits
{
    public const int MaxContentJsonLength = 500_000;
}
