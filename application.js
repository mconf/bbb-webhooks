import config from 'config';
import Logger from './src/common/logger.js';
import ModuleManager from './src/modules/index.js';
import EventProcessor from './src/process/event-processor.js';

/**
 * Application.
 * @class
 * @classdesc Wrapper class for the whole bbb-webhooks application.
 * @property {ModuleManager} moduleManager - Module manager.
 * @property {EventProcessor} eventProcessor - Event processor.
 * @property {boolean} _initialized - Initialized.
 */
class Application {
  /**
   * constructor.
   * @constructs Application
   */
  constructor() {
    this.moduleManager = new ModuleManager(config.get("modules"));
    this.eventProcessor = null;

    this._initialized = false;
  }

  /**
   * start.
   * @returns {Promise} Promise.
   * @async
   * @public
   */
  async start() {
    if (this._initialized) return Promise.resolve();

    let inputModules, outputModules;

    try {
      ({ inputModules, outputModules } = await this.moduleManager.load());
    } catch (error) {
      Logger.error("CRITICAL: failed to load modules, shutting down", error);
      await this.moduleManager.stopModules();
      process.exit(1);
    }

    this.eventProcessor = new EventProcessor(inputModules, outputModules);
    await this.eventProcessor.start();

    return Promise.all([
    ]).then(() => {
      Logger.info("bbb-webhooks started");
      this._initialized = true;
    }).catch((error) => {
      Logger.error("Error starting bbb-webhooks", error);
      process.exit(1);
    });
  }
}

export default Application;
