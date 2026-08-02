using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace TeaAWS.Utilities
{
    public static class WSMessageParser
    {
        private static readonly JsonSerializerOptions Options =
            new()
            {
                PropertyNameCaseInsensitive = true
            };

        public static T Parse<T>(string body)
        {
            var model = JsonSerializer.Deserialize<T>(body, Options);

            if (model == null)
                throw new JsonException("Failed to deserialize WebSocket message");

            return model;
        }
    }
}
