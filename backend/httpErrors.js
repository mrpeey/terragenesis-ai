// Centralized HTTP status codes and error identifiers
module.exports = {
  status: {
    OK: 200,
    NOT_FOUND: 404,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    INTERNAL_ERROR: 500
  },
  error: {
    INTERNAL: 'internal_error',
    NOT_FOUND: 'not_found',
    AI_TIMEOUT: 'ai_timeout',
    AI_ERROR: 'ai_error',
    AI_MALFORMED: 'ai_malformed'
  }
};
