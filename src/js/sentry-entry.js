/**
 * Sentry browser SDK entry point.
 * Bundled by esbuild during build into sentry.bundle.js.
 */
import * as Sentry from '@sentry/browser';
window.Sentry = Sentry;
