/**
 * Validation middleware factory using Zod schemas.
 *
 * Validates request data against the provided Zod schema.
 * Source can be 'body', 'params', or 'query' (defaults to 'body').
 *
 * If validation fails, calls next(error) with the ZodError so the centralized errorHandler
 * can format it consistently as a 400 response with all validation issues.
 *
 * If validation passes, updates req[source] with the parsed, validated data.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'params'|'query'} [source='body'] - Request property to validate
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error);
    }

    // Assign sanitized and parsed values back to req[source]
    try {
      req[source] = result.data;
    } catch {
      Object.assign(req[source], result.data);
    }

    next();
  };
}

export default validate;
