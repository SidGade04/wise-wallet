import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/store/useAuth';
import { AIInsight } from '@/types';

const API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8080';

export const useAIInsights = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch insights from Supabase
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['ai-insights', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AIInsight[];
    },
    enabled: !!user,
  });

  // Ask a question
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, question }),
      });

      if (!response.ok) throw new Error('Failed to get response from AI');
      return response.json();
    },
    onSuccess: async (data, question) => {
      if (!user) return;

      await supabase.from('ai_insights').insert({
        user_id: user.id,
        type: 'question',
        question,
        response: data.response,
      });

      queryClient.invalidateQueries({ queryKey: ['ai-insights', user.id] });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Analyze spending
  const analyzeSpendingMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/api/analyze?user_id=${user?.id}`);

      if (!response.ok) throw new Error('Failed to analyze spending');
      return response.json();
    },
    onSuccess: async (data) => {
      if (!user) return;

      await supabase.from('ai_insights').insert({
        user_id: user.id,
        type: 'summary',
        question: null,
        response: data.response,
      });

      queryClient.invalidateQueries({ queryKey: ['ai-insights', user.id] });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  return {
    insights,
    isLoading,
    isSubmitting,
    askQuestion: askQuestionMutation.mutate,
    analyzeSpending: analyzeSpendingMutation.mutate,
  };
};
