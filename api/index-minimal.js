// Minimal test to see if the function can start
import express from 'express';
import serverless from 'serverless-http';

const app = express();

app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Minimal function is working',
    timestamp: new Date().toISOString(),
  });
});

app.all('/api/*', (req, res) => {
  res.json({ 
    status: 'ok',
    path: req.path,
    method: req.method,
    message: 'Minimal handler working',
  });
});

const handler = serverless(app);
export default handler;
