import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Backend API plugin for pharmacist portal to securely generate dispensing tokens server-side.
 */
function dispenseTokenPharmacistPlugin(): Plugin {
  return {
    name: 'dispense-token-pharmacist-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        // 1. Generate Dispense Token (Called upon pharmacist prescription approval)
        if (url === '/api/dispense-tokens/generate' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              const { prescriptionId, slot, patientName, patientId } = JSON.parse(body);
              const { generateDispenseToken } = await server.ssrLoadModule('./src/server/dispenseTokenService.ts');
              const result = await generateDispenseToken({ prescriptionId, slot, patientName, patientId });
              res.statusCode = result.status || (result.success ? 200 : 400);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('[API /api/dispense-tokens/generate Error]:', err?.message || err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Failed to generate token' }));
            }
          });
          return;
        }

        // 2. Get Token for Prescription
        if (url?.startsWith('/api/dispense-tokens/prescription') && req.method === 'GET') {
          try {
            const rxId = url.split('/').pop() || '';
            const { getTokenForPrescription } = await server.ssrLoadModule('./src/server/dispenseTokenService.ts');
            const result = await getTokenForPrescription(rxId);
            res.statusCode = result.status || 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('[API /api/dispense-tokens/prescription Error]:', err?.message || err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message || 'Failed to get prescription token' }));
          }
          return;
        }

        // 3. Claim Dispense Token (Support if called from same host)
        if (url === '/api/dispense-tokens/claim' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              const { token } = JSON.parse(body);
              const authHeader = req.headers.authorization;
              const { claimDispenseToken } = await server.ssrLoadModule('./src/server/dispenseTokenService.ts');
              const result = await claimDispenseToken(token, authHeader);
              res.statusCode = result.status || (result.success ? 200 : 400);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('[API /api/dispense-tokens/claim Error]:', err?.message || err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Failed to claim token' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), dispenseTokenPharmacistPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
