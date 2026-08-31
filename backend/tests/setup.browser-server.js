// Opt-in local browser E2E harness: real API + PostgreSQL in a rolled-back transaction.
// Start with node --experimental-test-module-mocks tests/setup.browser-server.js.
// Enter any line on stdin to stop. No production entry point imports this file.
import { mock } from 'node:test';
import { once } from 'node:events';
import { randomUUID, randomBytes } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';

process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.FRONTEND_URL = 'http://127.0.0.1:5175';
const rollback = new Error('ROLLBACK_BROWSER_FIXTURES');
let userId;
try {
  await prisma.$transaction(async (tx) => {
    const moduleMock = mock.module('../src/config/prisma.js', { defaultExport: tx });
    const servers = [];
    try {
      const user = await tx.user.create({ data: {
        email: 'browser-' + randomUUID() + '@example.invalid',
        passwordHash: await bcrypt.hash('fixture-password', 4), firstName: 'Böngészős', lastName: 'Teszt',
      } });
      userId = user.id;
      const org = await tx.organization.create({ data: { name: 'Böngészős tesztszervezet',
        members: { create: { userId: user.id, role: 'OWNER' } },
      } });
      const { default: app } = await import('../src/app.js');
      const apiServer = app.listen(5001, '127.0.0.1');
      servers.push(apiServer);
      await once(apiServer, 'listening');
      const target = express();
      target.get('/site', async (req, res) => {
        // Auto-wire only this transaction's disposable project into the sample site.
        const project = await tx.project.findFirst({ where: { organizationId: org.id }, orderBy: { createdAt: 'desc' } });
        const options = JSON.stringify({ apiUrl: 'http://127.0.0.1:5001/api', projectKey: project?.publicKey }).replaceAll('<', '\\u003c');
        res.type('html').send('<!doctype html><html lang="hu"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Külső projekt – E2E teszt</title></head>' +
          '<body style="font:18px Arial;padding:80px 32px;background:#f8fafc"><h1 data-review-id="hero">Valódi céloldal próba</h1>' +
          '<p>Külön origin, valódi SDK és API, visszagörgetett tesztadatok.</p><button id="cta">Ajánlatot kérek</button>' +
          '<script type="module">import ReviewFlow from "http://127.0.0.1:5001/sdk/index.js";ReviewFlow.init(' + options + ');</script></body></html>');
      });
      const targetServer = target.listen(5002, '127.0.0.1');
      servers.push(targetServer);
      await once(targetServer, 'listening');
      console.log('API: http://127.0.0.1:5001/api');
      console.log('Target: http://127.0.0.1:5002/site?lang=hu#pricing');
      console.log('Disposable login: ' + user.email + ' / fixture-password');
      console.log('Enter a line to stop and roll back all test data (15 minute limit).');
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 14 * 60 * 1000);
        process.stdin.once('data', () => { clearTimeout(timer); resolve(); });
        process.stdin.resume();
      });
    } finally {
      process.stdin.pause();
      for (const server of servers) await new Promise((resolve) => server.close(resolve));
      moduleMock.restore();
    }
    throw rollback;
  }, { timeout: 15 * 60 * 1000 });
} catch (error) {
  if (error !== rollback) throw error;
} finally {
  if (userId && await prisma.user.findUnique({ where: { id: userId } })) throw new Error('Fixture rollback failed');
  await prisma.$disconnect();
  console.log('Browser fixtures rolled back.');
}
