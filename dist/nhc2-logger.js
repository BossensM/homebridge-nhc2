"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NHC2Logger {
    constructor(log, config) {
        this.log = log;
        this.config = config;
        this.wrappedLogger = log;
        this.logVerbose = config.verbose || false;
    }
    info(message, ...parameters) {
        this.wrappedLogger.info(message, ...parameters);
    }
    warn(message, ...parameters) {
        this.wrappedLogger.warn(message, ...parameters);
    }
    error(message, ...parameters) {
        this.wrappedLogger.error(message, ...parameters);
    }
    debug(message, ...parameters) {
        this.wrappedLogger.debug(message, ...parameters);
    }
    verbose(message, ...parameters) {
        if (this.logVerbose) {
            this.info(message, ...parameters);
        }
    }
}
exports.NHC2Logger = NHC2Logger;
//# sourceMappingURL=nhc2-logger.js.map