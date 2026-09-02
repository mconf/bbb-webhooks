import { describe, it, before, after } from 'mocha';
import assert from 'assert';
import net from 'net';
import ModuleManager from '../../src/modules/index.js';
import API from '../../src/out/webhooks/api/api.js';

const MODULES_SUITE = process.env.MODULES_SUITE ? process.env.MODULES_SUITE === 'true' : false;
const PROCESS_EVENTS = ['SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection'];

// ModuleManager.load registers process-wide signal and rejection handlers on its
// way out. The copies a successful load leaves behind would make a single stray
// rejection tear the whole suite down more than once.
const withProcessHandlersRestored = async (fn) => {
  const snapshot = PROCESS_EVENTS.map((event) => [event, process.listeners(event)]);

  try {
    return await fn();
  } finally {
    snapshot.forEach(([event, listeners]) => {
      process.removeAllListeners(event);
      listeners.forEach((listener) => process.on(event, listener));
    });
  }
};

const unloadableModule = (overrides = {}) => ({
  '../out/module-that-does-not-exist.js': {
    enabled: true,
    type: 'out',
    ...overrides,
  },
});

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

  describe('module load failure', () => {
    it('should abort the load when a mandatory module fails', () => withProcessHandlersRestored(async () => {
      const manager = new ModuleManager(unloadableModule());

      await assert.rejects(() => manager.load());
      assert.deepStrictEqual(manager.getOutputModules(), []);
    }));

    it('should skip a module explicitly marked optional', () => withProcessHandlersRestored(async () => {
      const manager = new ModuleManager(unloadableModule({ mandatory: false }));
      const { outputModules } = await manager.load();

      assert.deepStrictEqual(outputModules, []);
    }));
  });
}
