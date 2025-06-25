
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAC0m-0fPxVENPGFGeI23eVlnpUCx8g7so",
  authDomain: "breakfast-app-fdbcd.firebaseapp.com",
  projectId: "breakfast-app-fdbcd",
  storageBucket: "breakfast-app-fdbcd.firebasestorage.app",
  messagingSenderId: "515501590680",
  appId: "1:515501590680:web:99f76ced4c78fb9dad68ed",
  measurementId: "G-38P54MCL87"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
