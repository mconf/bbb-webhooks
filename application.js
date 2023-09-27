import config from 'config';
import Logger from './src/common/logger.js';
import ModuleManager from './src/modules/index.js';
import EventProcessor from './src/process/event-processor.js';

export default class Application {
  constructor() {
    this.moduleManager = new ModuleManager(config.get("modules"));
    this.eventProcessor = null;

    this._initialized = false;
  }

  async start() {
    if (this._initialized) return Promise.resolve();

    const { inputModules, outputModules } = await this.moduleManager.load();
    this.eventProcessor = new EventProcessor(
      inputModules,
      outputModules,
    );
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
