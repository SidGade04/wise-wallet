import { InsightFeed } from '@/components/ai/InsightFeed';
import { QuestionInput } from '@/components/ai/QuestionInput';
import { useAIInsights } from '@/hooks/useAIInsights';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function AIAssistant() {
  const { insights, isLoading, isSubmitting, askQuestion, analyzeSpending } = useAIInsights();

  return (
    <div className="h-full flex flex-col">
      <Card className="border-b rounded-none border-x-0 border-t-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-financial rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            AI Budget Assistant
          </CardTitle>
        </CardHeader>
      </Card>

      <InsightFeed 
        insights={insights} 
        isLoading={isLoading} 
        isSubmitting={isSubmitting}
      />

      <QuestionInput
        onAskQuestion={askQuestion}
        onAnalyzeSpending={analyzeSpending}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}