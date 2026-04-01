import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  dob: string | null;
  school: string | null;
  class: string | null;
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
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth session error:', error);
        // If there's any session error, especially refresh token related, clear everything
        await supabase.auth.signOut();
        set({ session: null, user: null, loading: false });
        return;
      }
      
      if (session) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // If we have a session but can't get the profile, something is wrong
          // But maybe don't sign out immediately, just set loading false
          set({ session, user: null, loading: false });
          return;
        }

        let finalProfile = profile;
        if (session.user.email === 'nguyenphuongaistudent@gmail.com' && profile && profile.role !== 'admin') {
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', session.user.id)
            .select()
            .single();
          finalProfile = updatedProfile;
        }
        
        set({ session, user: finalProfile, loading: false });
      } else {
        set({ session: null, user: null, loading: false });
      }
    } catch (err) {
      console.error('Auth initialization failed:', err);
      set({ session: null, user: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null });
        return;
      }

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        let finalProfile = profile;
        if (session.user.email === 'nguyenphuongaistudent@gmail.com' && profile && profile.role !== 'admin') {
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', session.user.id)
            .select()
            .single();
          finalProfile = updatedProfile;
        }
        set({ session, user: finalProfile });
      } else {
        set({ session: null, user: null });
      }
    });
  },
}));
