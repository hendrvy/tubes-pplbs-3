const request = require('supertest');

// ── Env harus sama persis dengan .env A2 ─────────────────────
process.env.JWT_SECRET           = 'TGAYET268191NIDIWQHO'; // dari .env.example A2
process.env.CROWD_SERVICE_URL    = 'http://localhost:8000';
process.env.INCIDENT_SERVICE_URL = 'http://localhost:8001';
process.env.ENV_SERVICE_URL      = 'http://localhost:8002';
process.env.PYTHON_ML_URL        = 'http://localhost:5000';
process.env.OAUTH_SERVER_URL     = 'http://localhost:3002';

const app = require('../index');
const jwt = require('jsonwebtoken');

// ── Helper: buat token valid sesuai payload A2 ────────────────
// password grant    → { userId, username, role: 'citizen' }
// client_cred grant → { clientId, role: 'service' }
function makePasswordToken(override = {}) {
  return jwt.sign(
    { userId: 1, username: 'Hendry', role: 'citizen', ...override },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}
function makeServiceToken(override = {}) {
  return jwt.sign(
    { clientId: 'backend_service', role: 'service', ...override },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('API Gateway — sinkronisasi A1 + A2', () => {

  // ── Health ────────────────────────────────────────────────
  describe('GET /health', () => {
    it('harus 200 atau 207, gateway up', async () => {
      const res = await request(app).get('/health');
      expect([200, 207]).toContain(res.statusCode);
      expect(res.body.gateway).toBe('up');
    });

    it('harus ada entry oauth-server di services list', async () => {
      const res = await request(app).get('/health');
      const oauth = res.body.services?.find(s => s.name === 'oauth-server');
      expect(oauth).toBeDefined();
    });
  });

  // ── JWT — payload A2 ─────────────────────────────────────
  describe('JWT Middleware — payload A2', () => {
    it('tanpa token → 401', async () => {
      const res = await request(app).get('/api/crowd/current');
      expect(res.statusCode).toBe(401);
      expect(res.body.service).toBe('api-gateway');
    });

    it('token palsu → 401', async () => {
      const res = await request(app)
        .get('/api/crowd/current')
        .set('Authorization', 'Bearer ini-token-palsu');
      expect(res.statusCode).toBe(401);
    });

    it('token expired → 401 pesan kadaluarsa', async () => {
      const expired = jwt.sign(
        { userId: 1, username: 'Hendry', role: 'citizen' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );
      await new Promise(r => setTimeout(r, 50));
      const res = await request(app)
        .get('/api/crowd/current')
        .set('Authorization', `Bearer ${expired}`);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/kadaluarsa/i);
    });

    it('password grant token (userId+username+role) → bukan 401', async () => {
      const token = makePasswordToken();
      const res = await request(app)
        .get('/api/crowd/current')
        .set('Authorization', `Bearer ${token}`);
      // 401 = JWT gagal | 502 = JWT lolos, upstream belum jalan (expected saat test)
      expect(res.statusCode).not.toBe(401);
    });

    it('client_credentials token (clientId+role) → bukan 401', async () => {
      const token = makeServiceToken();
      const res = await request(app)
        .get('/api/crowd/current')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).not.toBe(401);
    });

    it('token user Rafi juga harus lolos', async () => {
      const token = makePasswordToken({ userId: 2, username: 'Rafi' });
      const res = await request(app)
        .get('/api/crowd/current')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).not.toBe(401);
    });
  });

  // ── OAuth proxy ───────────────────────────────────────────
  describe('OAuth proxy — /oauth/* diteruskan ke A2', () => {
    it('/oauth/token tidak butuh JWT (public)', async () => {
      const res = await request(app).post('/oauth/token').type('form').send({});
      expect(res.statusCode).not.toBe(401);
      // 400 = A2 tolak karena body kosong | 502 = A2 belum jalan — keduanya valid
      expect([400, 401, 500, 502]).toContain(res.statusCode); // 401 dari A2 bukan Gateway
    });

    it('/oauth/introspect tidak butuh JWT (public)', async () => {
      const res = await request(app).post('/oauth/introspect').type('form').send({ token: 'x' });
      expect(res.statusCode).not.toBe(401);
    });

    it('/oauth/revoke tidak butuh JWT (public)', async () => {
      const res = await request(app).post('/oauth/revoke').type('form').send({ token: 'x' });
      expect(res.statusCode).not.toBe(401);
    });
  });

  // ── IoT endpoints ─────────────────────────────────────────
  describe('IoT endpoints — tanpa JWT', () => {
    it('POST /iot/crowd tidak perlu JWT', async () => {
      const res = await request(app)
        .post('/iot/crowd')
        .send({ zone: 'zone1', crowd_count: 50 });
      // 502 = Crowd Service belum jalan — JWT tidak halangi
      expect(res.statusCode).not.toBe(401);
    });
  });

  // ── Response format standar ───────────────────────────────
  describe('Response format', () => {
    it('404 harus punya semua field standar', async () => {
      const res = await request(app).get('/tidak-ada');
      expect(res.statusCode).toBe(404);
      expect(res.body).toMatchObject({
        status: 'error',
        code: 404,
        service: 'api-gateway',
      });
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.message).toBeDefined();
    });

    it('401 harus punya semua field standar', async () => {
      const res = await request(app).get('/api/crowd/current');
      expect(res.body).toMatchObject({
        status: 'error',
        code: 401,
        service: 'api-gateway',
      });
    });
  });

});
