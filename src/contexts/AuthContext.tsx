
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string;
  isAdmin: boolean;
  name?: string;
  selectedBlock?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUserBlock: (blockId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, name: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    const userDoc = {
      uid: result.user.uid,
      email: result.user.email,
      name: name,
      isAdmin: email === 'admin@breakfastbuddy.com', // Make admin based on email
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(doc(db, 'users', result.user.uid), userDoc);
  }

  async function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function updateUserBlock(blockId: string) {
    if (currentUser && userData) {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { selectedBlock: blockId }, { merge: true });
      setUserData({ ...userData, selectedBlock: blockId });
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    login,
    signup,
    logout,
    loading,
    updateUserBlock,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
