import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { OWNER_VAULT_APP_NAME, adoptSharedAuthSession } from "./owner-vault";

const firebaseConfig = {
  apiKey: "AIzaSyATQK7NHNXIshlJIy7xT17z8Kr8fUWatLs",
  authDomain: "pickledgerpro.firebaseapp.com",
  projectId: "pickledgerpro",
  storageBucket: "pickledgerpro.firebasestorage.app",
  messagingSenderId: "285462656063",
  appId: "1:285462656063:web:caa084d1daf04e04eab48a",
};

adoptSharedAuthSession(firebaseConfig.apiKey, ["simplfy"]);

export const firebaseApp = getApps().find((app) => app.name === OWNER_VAULT_APP_NAME)
  ?? initializeApp(firebaseConfig, OWNER_VAULT_APP_NAME);

export const firebaseAuth = getAuth(firebaseApp);
export const authPersistenceReady = setPersistence(firebaseAuth, browserLocalPersistence);
export const simplfyFirestore = getFirestore(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
