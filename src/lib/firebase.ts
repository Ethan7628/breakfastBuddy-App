import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  collection, getDocs, addDoc, doc,
  query, where, onSnapshot
} from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyAC0m-0fPxVENPGFGeI23eVlnpUCx8g7so",
  authDomain: "breakfast-app-fdbcd.firebaseapp.com",
  projectId: "breakfast-app-fdbcd",
  storageBucket: "breakfast-app-fdbcd.appspot.com",
  messagingSenderId: "515501590680",
  appId: "1:515501590680:web:99f76ced4c78fb9dad68ed",
  measurementId: "G-38P54MCL87"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin initialization function
export const initializeAdmin = async (email: string, password: string) => {
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { doc, setDoc } = await import('firebase/firestore');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "admins", user.uid), {
      email: email,
      uid: user.uid,
      role: "admin",
      createdAt: new Date()
    });

    await setDoc(doc(db, "users", user.uid), {
      name: "Admin",
      email: email,
      isAdmin: true
    });

    console.log("Admin initialized successfully!");
    return user;
  } catch (error) {
    console.error("Error initializing admin:", error);
    throw error;
  }
};

// Call this function once to create your first admin
initializeAdmin("kusasirakwe.ethan.upti@gmail.com", "eth256");

// Add to your existing firestore.ts
export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export const addMenuItem = async (item: MenuItem) => {
  return await addDoc(collection(db, 'breakfastItems'), item);
};

export const getUserCart = async (userId: string) => {
  const q = query(
    collection(db, 'userCarts'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addToUserCart = async (userId: string, itemId: string, itemData: MenuItem) => {
  return await addDoc(collection(db, 'userCarts'), {
    userId,
    itemId,
    ...itemData,
    addedAt: new Date().toISOString()
  });
};

export const getAllCarts = async () => {
  const snapshot = await getDocs(collection(db, 'userCarts'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};