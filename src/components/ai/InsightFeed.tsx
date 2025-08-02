import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIInsight } from '@/types';
import { Bot, User } from 'lucide-react';
import { format } from 'date-fns';

interface InsightFeedProps {
  insights: AIInsight[];
  isLoading: boolean;
  isSubmitting: boolean;
}

export function InsightFeed({ insights, isLoading, isSubmitting }: InsightFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [insights, isSubmitting]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading your insights...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {insights.length === 0 && !isSubmitting && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
            <p className="text-muted-foreground">
              Ask a question or analyze your spending to get started!
            </p>
          </div>
        )}

        {insights.map((insight) => (
          <div key={insight.id} className="space-y-3">
            {insight.question && (
              <div className="flex items-start gap-3 justify-end">
                <Card className="max-w-[80%] bg-primary text-primary-foreground">
                  <CardContent className="p-3">
                    <p className="text-sm">{insight.question}</p>
                  </CardContent>
                </Card>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-financial text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="flex-1 max-w-[80%]">
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{insight.response}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(insight.created_at), 'MMM d, h:mm a')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}

        {isSubmitting && (
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gradient-financial text-white">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="flex-1 max-w-[80%]">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <p className="text-sm text-muted-foreground">Generating insights...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}