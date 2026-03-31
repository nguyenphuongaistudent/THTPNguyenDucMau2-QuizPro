import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'teacher' | 'student';
}

interface AuthState {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  setSession: (session: any | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
  initialize: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      set({ session, user: profile, loading: false });
    } else {
      set({ session: null, user: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ session, user: profile });
      } else {
        set({ session: null, user: null });
      }
    });
  },
}));
