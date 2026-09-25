import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';

/**
 * Backend API plugin that handles Groq prescription extraction and key configuration server-side.
 * Ensures the API key is never bundled or sent to the browser, and all AI requests originate server-side.
 */
function groqBackendPlugin(): Plugin {
  return {
    name: 'groq-backend-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        // 1. Prescription extraction endpoint (Server-side Groq call)
        if (url === '/api/extract-prescription' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              const { imageBase64, mimeType } = JSON.parse(body);
              const { extractPrescriptionWithGroq } = await server.ssrLoadModule('./src/server/groqExtraction.ts');
              const data = await extractPrescriptionWithGroq(imageBase64, mimeType);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data }));
            } catch (err: any) {
              console.error('[API /api/extract-prescription Error]:', err?.message || err);
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Extraction failed' }));
            }
          });
          return;
        }

        // 2. Server-side key management: update GROQ_API_KEY
        if (url === '/api/config/groq-key' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              const { apiKey } = JSON.parse(body);
              const { saveGroqApiKeyToServer } = await server.ssrLoadModule('./src/server/groqExtraction.ts');
              const result = saveGroqApiKeyToServer(apiKey || '');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('[API /api/config/groq-key Error]:', err?.message || err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Failed to update key' }));
            }
          });
          return;
        }

        // 3. Server-side key status: check if key is configured (never returns the key)
        if (url === '/api/config/groq-key' && req.method === 'GET') {
          try {
            const { getGroqApiKey } = await server.ssrLoadModule('./src/server/groqExtraction.ts');
            const hasKey = Boolean(getGroqApiKey());
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ configured: hasKey }));
          } catch (err: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ configured: false }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load environment variables for server-side process
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }

  return {
    plugins: [react(), tailwindcss(), groqBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // We intentionally do NOT define GROQ_API_KEY in client define block to preserve confidentiality
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
