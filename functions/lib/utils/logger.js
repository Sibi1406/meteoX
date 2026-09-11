// utils/logger.js — Structured logger for Cloud Functions

function info(message, meta = {}) {
  console.log(JSON.stringify({ severity: "INFO", message, ...meta, timestamp: new Date().toISOString() }));
}

function warn(message, meta = {}) {
  console.warn(JSON.stringify({ severity: "WARNING", message, ...meta, timestamp: new Date().toISOString() }));
}

function error(message, err = null, meta = {}) {
  console.error(
    JSON.stringify({
      severity: "ERROR",
      message,
      error: err ? { message: err.message, stack: err.stack } : null,
      ...meta,
      timestamp: new Date().toISOString(),
    })
  );
}

module.exports = { info, warn, error };
