import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatInterface = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tone, setTone] = useState("gentle");
  const { toast } = useToast();

  const handleStart = () => {
    setIsStarted(true);
    const botWelcome: Message = {
      id: "welcome",
      content: "Hi, I'm glad you reached out today. How are you feeling right now?",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([botWelcome]);
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-companion', {
        body: {
          message: userMessage.content,
          conversationHistory: messages.map(msg => ({
            content: msg.content,
            isUser: msg.isUser
          })),
          tone
        }
      });

      if (error) throw error;

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I'm here to listen. Could you tell me more about how you're feeling?",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages([...newMessages, botResponse]);

      if (data.isHighRisk) {
        toast({
          title: "Emergency Support Available",
          description: "If you're in immediate danger, please contact emergency services or the helplines mentioned above.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm here to support you. Sometimes I have technical difficulties, but your feelings matter to me. How are you doing right now?",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
      
      toast({
        title: "Connection Error",
        description: "I'm still here for you, even if there's a technical hiccup.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-accent rounded-full flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">MannMitra</h1>
          <p className="text-muted-foreground text-lg">Your Mental Wellness Companion</p>
        </div>
        
        <Card className="p-6 mb-8 bg-card shadow-card">
          <h2 className="text-xl font-semibold mb-3 text-foreground">Ready to talk?</h2>
          <p className="text-muted-foreground">
            I'm here to listen and support you on your mental wellness journey.
          </p>
        </Card>
        
        <Button 
          onClick={handleStart}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-soft"
        >
          Start Talking to MannMitra
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] p-3 ${
              msg.isUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card shadow-card'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-3 bg-card shadow-card">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </Card>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-border bg-card">
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            <Button
              variant={tone === "gentle" ? "default" : "outline"}
              size="sm"
              onClick={() => setTone("gentle")}
            >
              Gentle
            </Button>
            <Button
              variant={tone === "cheerful" ? "default" : "outline"}
              size="sm"
              onClick={() => setTone("cheerful")}
            >
              Cheerful
            </Button>
            <Button
              variant={tone === "formal" ? "default" : "outline"}
              size="sm"
              onClick={() => setTone("formal")}
            >
              Formal
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share what's on your mind..."
            className="flex-1 min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend}
            className="self-end mb-2"
            size="icon"
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;