import test from 'node:test';
import assert from 'node:assert/strict';

import { getFirebaseWebConfig, hasFirebaseWebConfig } from './firebaseConfig.js';

test('reports missing Firebase env keys when config is incomplete', () => {
  const result = getFirebaseWebConfig({
    VITE_FIREBASE_API_KEY: '',
    VITE_FIREBASE_AUTH_DOMAIN: '',
    VITE_FIREBASE_PROJECT_ID: '',
    VITE_FIREBASE_STORAGE_BUCKET: '',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '',
    VITE_FIREBASE_APP_ID: '',
    VITE_FIREBASE_MEASUREMENT_ID: '',
  });

  assert.equal(result.missing.length > 0, true);
  assert.equal(hasFirebaseWebConfig(result.config), false);
});

test('accepts a complete Firebase config object', () => {
  const result = getFirebaseWebConfig({
    VITE_FIREBASE_API_KEY: 'api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'app.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'demo-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'demo.firebasestorage.app',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: 'app-id',
    VITE_FIREBASE_MEASUREMENT_ID: 'measurement-id',
  });

  assert.equal(result.missing.length, 0);
  assert.equal(hasFirebaseWebConfig(result.config), true);
});
