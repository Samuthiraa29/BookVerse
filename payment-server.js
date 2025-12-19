// payment-server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

const port = 4000; // Use a different port to avoid conflict with your main server

// This will store our public localtunnel URL
let publicUrl = '';

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes on this server
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

// Endpoint for the checkout page to get the public URL
app.get('/api/get-public-url', (req, res) => {
    if (publicUrl) {
        res.json({ url: publicUrl });
    } else {
        res.status(503).json({ error: 'Public URL is not ready yet. Please try again in a moment.' });
    }
});

// Endpoint for the checkout page to get the public WebSocket URL
app.get('/api/get-ws-url', (req, res) => {
    if (publicUrl) {
        // Replace http with ws protocol
        const wsUrl = publicUrl.replace(/^http/, 'ws');
        res.json({ url: wsUrl });
    } else {
        res.status(503).json({ error: 'Public WebSocket URL is not ready yet.' });
    }
});

// This map will store WebSocket connections by their transactionId
const transactionSockets = new Map();

// Endpoint for the mobile simulator to confirm payment
app.post('/api/confirm-payment', (req, res) => {
    const { transactionId, status } = req.body;
    console.log(`[PaymentAPI] Received confirmation for ${transactionId} with status: ${status}`);

    const clientSocket = transactionSockets.get(transactionId);

    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        const messageType = status === 'success' ? 'payment_success' : 'payment_cancelled';
        clientSocket.send(JSON.stringify({ type: messageType, transactionId }));
        console.log(`[PaymentSocket] Sent ${messageType} to client for ${transactionId}`);
        transactionSockets.delete(transactionId); // Clean up the map
    } else {
        console.log(`[PaymentSocket] No active client found for ${transactionId}`);
    }

    res.status(200).json({ message: 'Confirmation received' });
});

// --- Server and WebSocket Setup ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('[PaymentSocket] Client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register' && data.transactionId) {
                transactionSockets.set(data.transactionId, ws);
                console.log(`[PaymentSocket] Registered client for transaction: ${data.transactionId}`);
            }
        } catch (e) {
            console.error('[PaymentSocket] Failed to parse message:', e);
        }
    });

    ws.on('close', () => {
        console.log('[PaymentSocket] Client disconnected');
        for (const [txnId, socket] of transactionSockets.entries()) {
            if (socket === ws) {
                transactionSockets.delete(txnId);
                break;
            }
        }
    });
});

// --- Start Server and serveo tunnel ---
server.listen(port, () => {
    console.log(`💳 Real-time payment server listening on http://localhost:${port}`);

    // Use serveo.net to create a tunnel
    (async function() {
      try {
        // The command to create a tunnel with a random subdomain on serveo.net
        const tunnelCommand = `ssh -R 80:localhost:${port} serveo.net`;
        const child = exec(tunnelCommand);

        // Listen for output from the ssh command to get the public URL
        child.stdout.on('data', (data) => {
          // serveo.net provides a URL in its stdout
          const urlMatch = data.match(/(https?:\/\/[a-zA-Z0-9-]+\.serveo\.net)/);
          if (urlMatch && !publicUrl) {
            publicUrl = urlMatch[0];
            console.log(`\n✅ Public tunnel is active! URL: ${publicUrl}`);
          }
        });

        child.stderr.on('data', (data) => {
          // Don't treat "Pseudo-terminal will not be allocated" as a fatal error
          if (!data.includes('Pseudo-terminal')) {
            console.error(`Tunnel error: ${data}`);
          }
        });

      } catch (error) {
        console.error('Error starting tunnel:', error);
        process.exit(1);
      }
    })();
});
