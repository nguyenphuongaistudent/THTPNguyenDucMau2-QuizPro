import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface QuizState {
  subjects: any[];
  topics: any[];
  loading: boolean;
  fetchSubjects: () => Promise<void>;
  fetchTopics: (subjectId: string) => Promise<void>;
}

export const useQuizStore = create<QuizState>((set) => ({
  subjects: [],
  topics: [],
  loading: false,
  fetchSubjects: async () => {
    set({ loading: true });
    const { data } = await supabase.from('subjects').select('*').order('name');
    set({ subjects: data || [], loading: false });
  },
  fetchTopics: async (subjectId: string) => {
    set({ loading: true });
    const { data } = await supabase.from('topics').select('*').eq('subject_id', subjectId).order('name');
    set({ topics: data || [], loading: false });
  },
}));
