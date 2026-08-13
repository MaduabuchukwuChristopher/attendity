import type { RequestHandler } from 'express';
import type { z } from 'zod';
export function validate(schema: z.ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query,
      headers: request.headers,
    });
    if (!result.success)
      return next(
        Object.assign(new Error('Request validation failed.'), {
          statusCode: 422,
          details: result.error.flatten(),
        }),
      );
    const validated = result.data as {
      readonly body?: unknown;
      readonly params?: Readonly<Record<string, string>>;
    };
    if (validated.body !== undefined) request.body = validated.body;
    if (validated.params) Object.assign(request.params, validated.params);
    return next();
  };
}
