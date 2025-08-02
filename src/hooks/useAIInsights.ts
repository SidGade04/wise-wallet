import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/store/useAuth';
import { AIInsight } from '@/types';

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

  // Mock API calls for FastAPI backend
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      setIsSubmitting(true);
      try {
        // TODO: Replace with actual FastAPI endpoint
        const response = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
        });

        if (!response.ok) {
          // Mock response for development
          await new Promise(resolve => setTimeout(resolve, 2000));
          return {
            response: `Based on your spending patterns, here's what I found about "${question}": This is a mock response. Your actual insights will come from the FastAPI backend once it's connected.`
          };
        }

        return response.json();
      } catch (error) {
        // Mock response for development
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          response: `Based on your spending patterns, here's what I found about "${question}": This is a mock response. Your actual insights will come from the FastAPI backend once it's connected.`
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: async (data, question) => {
      if (!user) return;

      // Save to Supabase
      await supabase.from('ai_insights').insert({
        user_id: user.id,
        type: 'question',
        question,
        response: data.response,
      });

      queryClient.invalidateQueries({ queryKey: ['ai-insights', user.id] });
    },
  });

  const analyzeSpendingMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      try {
        // TODO: Replace with actual FastAPI endpoint
        const response = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // Mock response for development
          await new Promise(resolve => setTimeout(resolve, 3000));
          return {
            response: "Here's your spending analysis: You've spent 15% more on dining out this month compared to last month. Consider setting a weekly dining budget to help control these expenses. Your grocery spending is well within budget - great job!"
          };
        }

        return response.json();
      } catch (error) {
        // Mock response for development
        await new Promise(resolve => setTimeout(resolve, 3000));
        return {
          response: "Here's your spending analysis: You've spent 15% more on dining out this month compared to last month. Consider setting a weekly dining budget to help control these expenses. Your grocery spending is well within budget - great job!"
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: async (data) => {
      if (!user) return;

      // Save to Supabase
      await supabase.from('ai_insights').insert({
        user_id: user.id,
        type: 'summary',
        question: null,
        response: data.response,
      });

      queryClient.invalidateQueries({ queryKey: ['ai-insights', user.id] });
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