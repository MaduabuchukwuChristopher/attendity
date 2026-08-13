import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/openapi.js';
import { environment } from '../config/environment.js';

export const docsRouter = Router();

if (environment.ENABLE_API_DOCS) {
  docsRouter.get('/api/openapi.json', (_request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.json(openApiDocument);
  });
  docsRouter.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Attendity API documentation',
      swaggerOptions: { persistAuthorization: false, displayRequestDuration: true },
    }),
  );
}
