import { describe, it, before, after } from 'mocha';
import assert from 'assert';
import net from 'net';
import API from '../../src/out/webhooks/api/api.js';

const MODULES_SUITE = process.env.MODULES_SUITE ? process.env.MODULES_SUITE === 'true' : false;

export default function suite({ force }) {
  if (!MODULES_SUITE && !force) return;

  describe('API server bind failure', () => {
    let blocker;

    before((done) => {
      blocker = net.createServer();
      blocker.listen(0, '127.0.0.1', done);
    });

    after((done) => {
      blocker.close(done);
    });

    it('should reject when the port is already taken', async () => {
      const api = new API({
        secret: 'secret',
        exporter: {},
        permanentURLs: [],
        supportedChecksumAlgorithms: ['sha1'],
      });

      // The rejection must carry the real cause: bind failures also cover
      // EACCES and unresolvable bind addresses, not just a taken port.
      await assert.rejects(
        () => api.start(blocker.address().port, '127.0.0.1'),
        (error) => error.code === 'EADDRINUSE',
      );
    });
  });
}
