import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Sparkles } from 'lucide-react';

interface QuestionInputProps {
  onAskQuestion: (question: string) => void;
  onAnalyzeSpending: () => void;
  isSubmitting: boolean;
}

export function QuestionInput({ onAskQuestion, onAnalyzeSpending, isSubmitting }: QuestionInputProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isSubmitting) {
      onAskQuestion(question.trim());
      setQuestion('');
    }
  };

  return (
    <Card className="p-4 border-t">
      <div className="space-y-3">
        <Button
          onClick={onAnalyzeSpending}
          disabled={isSubmitting}
          className="w-full bg-gradient-financial hover:bg-gradient-financial/90"
          size="lg"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Analyze My Spending
        </Button>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your spending... (e.g., What did I overspend on last month?)"
            disabled={isSubmitting}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!question.trim() || isSubmitting}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}