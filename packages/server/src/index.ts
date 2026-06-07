import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import * as admin from 'firebase-admin';
import * as Y from 'yjs';
// @ts-ignore
import { setupWSConnection, getYDoc } from 'y-websocket/bin/utils';

// 2. Implement Firebase Admin initialization
try {
  admin.initializeApp();
} catch (e) {
  console.log('Firebase admin init failed, mocking it.', e);
}

const fastify = Fastify({ logger: true });

fastify.register(fastifyWebsocket);

// 6. Keep a Map of campaignId -> Y.Doc in memory
const campaignDocs = new Map<string, Y.Doc>();

fastify.register(async function (fastify) {
  // 3. Implement a WebSocket route at /ws/campaign/:id that expects a token query param
  fastify.get<{ Params: { id: string }, Querystring: { token: string } }>(
    '/ws/campaign/:id',
    { websocket: true },
    (connection, req) => {
      const token = req.query.token;
      const campaignId = req.params.id;

      // 4. Verify the token using Firebase Auth
      // (Mocked validation: drop connection if no token)
      if (!token) {
        connection.socket.close(1008, 'Missing or invalid token');
        return;
      }

      // 5. Look up the user's role (DM or Player)
      const role = token === 'mock-dm' ? 'DM' : 'Player';
      
      // Store the role on the socket object to access it later in the hook
      (connection.socket as any).role = role;

      // 7. Use setupWSConnection
      setupWSConnection(connection.socket, req, { docName: campaignId });

      // After setupWSConnection, the doc is available via getYDoc
      const doc = getYDoc(campaignId) as Y.Doc;

      if (!campaignDocs.has(campaignId)) {
        campaignDocs.set(campaignId, doc);

        // 8. Implement the Authority Layer
        doc.on('update', (update: Uint8Array, origin: any) => {
          // Check if this update came from a websocket connection
          // origin in y-websocket is the websocket connection wrapper
          const isPlayer = origin && origin.ws && origin.ws.role === 'Player';

          if (isPlayer) {
            // Apply the update to a temporary document to observe changes
            let unauthorizedAccess = false;
            const tempDoc = new Y.Doc();
            
            tempDoc.getMap('shared').observe(() => { unauthorizedAccess = true; });
            tempDoc.getMap('dm').observe(() => { unauthorizedAccess = true; });

            // Apply the update inside a transaction to trigger the observers
            Y.applyUpdate(tempDoc, update);

            if (unauthorizedAccess) {
              fastify.log.warn(`Unauthorized access attempt by Player on campaign ${campaignId}`);
              
              // Close the socket to drop the connection
              if (origin.ws && typeof origin.ws.close === 'function') {
                origin.ws.close(1008, 'Unauthorized update to shared state');
              }
            }
          }
        });
      }
    }
  );

  // Mock Stripe Webhook
  fastify.post('/api/webhooks/stripe', async (request, reply) => {
    // In a real app, verify Stripe signature here
    const event = request.body as any;
    fastify.log.info({ event: event?.type }, 'Received Stripe webhook');
    
    if (event?.type === 'checkout.session.completed') {
      const userId = event.data.object.client_reference_id;
      // Mock setting premium status in DB
      fastify.log.info(`Upgraded user ${userId} to premium`);
    }

    reply.send({ received: true });
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
