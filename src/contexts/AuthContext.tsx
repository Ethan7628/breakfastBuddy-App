
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserData {
  uid: string;
  name: string;
  email: string;
  location?: string;
  block?: string;
  selectedBlock?: string;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserBlock: (blockId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const signup = async (email: string, password: string, name: string): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData: UserData = {
      uid: user.uid,
      name,
      email,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', user.uid), userData);
  };

  const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const updateUserBlock = async (blockId: string): Promise<void> => {
    if (!currentUser) throw new Error('No user logged in');

    console.log('Updating user block in Firestore:', { userId: currentUser.uid, blockId });
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        selectedBlock: blockId,
        updatedAt: new Date().toISOString()
      });

      console.log('Successfully updated user block in Firestore');

      // Update local state
      if (userData) {
        const updatedUserData = { ...userData, selectedBlock: blockId };
        setUserData(updatedUserData);
        console.log('Updated local user data:', updatedUserData);
      }
    } catch (error) {
      console.error('Error updating user block in Firestore:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email);
      
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          if (userDoc.exists()) {
            const docData = userDoc.data();
            const userData = {
              ...docData,
              uid: user.uid
            } as UserData;
            
            console.log('User data loaded from Firestore:', userData);
            setUserData(userData);
          } else {
            // If user document doesn't exist, create it
            const newUserData: UserData = {
              uid: user.uid,
              name: user.displayName || 'User',
              email: user.email || '',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), newUserData);
            setUserData(newUserData);
            console.log('Created new user document:', newUserData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    signup,
    logout,
    updateUserBlock
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
