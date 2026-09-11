// admin.js — single shared Firebase Admin instance used by every function file.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const app = initializeApp();
const db = getFirestore(app);
const messaging = getMessaging(app);

module.exports = { app, db, messaging };
