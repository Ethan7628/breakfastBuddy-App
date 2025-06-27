// adminSetup.ts
import { initializeAdmin } from '@/lib/firebase';

export const setupAdminAccount = async () => {
  try {
    const adminEmail = "kusasirakwe.ethan.upti@gmail.com";
    const adminPassword = "eth256";

    await initializeAdmin(adminEmail, adminPassword);
    console.log('Admin account setup completed');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('email-already-in-use')) {
      console.log('Admin account already exists');
      return true;
    } else {
      console.error('Error setting up admin:', error);
      return false;
    }
  }
};
