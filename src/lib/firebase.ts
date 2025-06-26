
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  collection, getDocs, addDoc, doc, setDoc,
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

// Admin initialization function (only call when needed)
export const initializeAdmin = async (email: string, password: string) => {
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { doc, setDoc, getDoc } = await import('firebase/firestore');

    // Check if admin already exists
    const adminQuery = query(collection(db, 'users'), where('email', '==', email));
    const existingAdmins = await getDocs(adminQuery);
    
    if (!existingAdmins.empty) {
      console.log("Admin already exists");
      return null;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name: "Admin",
      email: email,
      isAdmin: true,
      createdAt: new Date().toISOString()
    });

    console.log("Admin initialized successfully!");
    return user;
  } catch (error) {
    console.error("Error initializing admin:", error);
    throw error;
  }
};

// Menu item interfaces
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
  image?: string;
}

export interface CartItem {
  id: string;
  userId: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  addedAt: string;
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

export const addToUserCart = async (userId: string, itemId: string, itemData: { name: string; price: number }) => {
  return await addDoc(collection(db, 'userCarts'), {
    userId,
    itemId,
    name: itemData.name,
    price: itemData.price,
    quantity: 1,
    addedAt: new Date().toISOString()
  });
};

export const getAllCarts = async () => {
  const snapshot = await getDocs(collection(db, 'userCarts'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
