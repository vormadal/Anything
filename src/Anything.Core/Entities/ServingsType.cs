using System.Text.Json.Serialization;

namespace Anything.Core.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ServingsType
{
    People,
    Quantity,
    Pieces
}
