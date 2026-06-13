const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Format custom: timestamp | method | path | status | response time | ip
morgan.token('timestamp', () => new Date().toISOString());
morgan.token('body-size', (req, res) => res.get('Content-Length') || '-');

const FORMAT =
  ':timestamp | :method :url | :status | :response-time ms | :body-size bytes | :remote-addr';

// Log ke console (development)
const consoleLogger = morgan(FORMAT, {
  stream: process.stdout,
  skip: (req) => req.path === '/health', // jangan log health check
});

// Log ke file (production)
let fileLogger = null;
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const accessLog = fs.createWriteStream(path.join(logDir, 'access.log'), {
    flags: 'a',
  });
  fileLogger = morgan(FORMAT, { stream: accessLog });
}

function logger(req, res, next) {
  if (fileLogger) fileLogger(req, res, () => {});
  consoleLogger(req, res, next);
}

module.exports = logger;
