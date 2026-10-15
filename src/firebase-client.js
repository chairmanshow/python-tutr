import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import cfg from "../firebase-applet-config.json";

// Initialize app with provisioned config
let app;
if (!firebase.apps.length) {
  app = firebase.initializeApp(cfg);
} else {
  app = firebase.app();
}

// Instantiate modular firestore with the user's specific database ID
const databaseId = cfg.firestoreDatabaseId || "ai-studio-pythontutr-56f85dc1-308f-460c-ae88-4fabdc5fb4f8";
const modularDb = getFirestore(app._delegate, databaseId);

// Wrap into compat Firestore instance
const compatSample = firebase.firestore();
const customDb = new compatSample.constructor(app, modularDb);

// Preserve static methods and properties on firebase.firestore
const origFirestore = firebase.firestore;
const customFirestoreFunc = function() {
  return customDb;
};
Object.assign(customFirestoreFunc, origFirestore);
firebase.firestore = customFirestoreFunc;
app.firestore = () => customDb;

// Provide error handler compliant with skill
const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write'
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: app.auth()?.currentUser?.uid || null,
      email: app.auth()?.currentUser?.email || null,
      emailVerified: app.auth()?.currentUser?.emailVerified || null,
      isAnonymous: app.auth()?.currentUser?.isAnonymous || null,
      providerInfo: app.auth()?.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Expose globally
window.firebase = firebase;
window.auth = app.auth();
window.db = customDb;
window.handleFirestoreError = handleFirestoreError;
window.OperationType = OperationType;

// Validate Connection to Firestore on boot as specified in SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(modularDb, '_health', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network connection.");
    }
  }
}
testConnection();
