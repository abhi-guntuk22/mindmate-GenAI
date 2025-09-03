import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format, subDays } from 'date-fns';

interface MoodEntry {
  id: string;
  mood_value: number;
  mood_emoji: string;
  note: string | null;
  created_at: string;
}

const MoodTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [thoughts, setThoughts] = useState("");
  const [aiTip, setAiTip] = useState("");
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const moods = [
    { id: "sad", emoji: "😔", label: "Sad", color: "mood-sad", value: 1 },
    { id: "okay", emoji: "😐", label: "Okay", color: "mood-okay", value: 2 },
    { id: "good", emoji: "🙂", label: "Good", color: "mood-good", value: 3 },
    { id: "great", emoji: "😄", label: "Great", color: "mood-great", value: 4 },
  ];

  useEffect(() => {
    if (user) {
      fetchMoodHistory();
    }
  }, [user]);

  const fetchMoodHistory = async () => {
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching mood history:', error);
    } else {
      setMoodHistory(data || []);
    }
  };

  const saveMoodEntry = async () => {
    if (!user || !selectedMood) return;

    setIsSubmitting(true);
    const selectedMoodData = moods.find(m => m.id === selectedMood);
    
    try {
      const { error } = await supabase
        .from('mood_entries')
        .insert([
          {
            user_id: user.id,
            mood_value: selectedMoodData?.value || 2,
            mood_emoji: selectedMoodData?.emoji || "😐",
            note: thoughts || null,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Mood saved!",
        description: "Your mood has been recorded successfully.",
      });

      // Reset form and refresh history
      setSelectedMood(null);
      setThoughts("");
      setAiTip("");
      fetchMoodHistory();
      
    } catch (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Error",
        description: "Failed to save mood entry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetTip = () => {
    const tips = {
      sad: "It's okay to feel sad sometimes, yaar. Try taking deep breaths, going for a short walk, or talking to someone you trust. Remember, yeh feeling pass ho jayegi.",
      okay: "You're doing fine! Consider doing something that brings you small joy - maybe listening to your favorite song or having a warm drink.",
      good: "Great to hear you're feeling good! This is a perfect time to practice gratitude or do something kind for someone else.",
      great: "Wonderful! You're radiating positive energy. Consider sharing this joy with others or using this energy to tackle something you've been putting off."
    };
    
    const moodKey = selectedMood as keyof typeof tips;
    setAiTip(tips[moodKey] || "Keep taking care of your mental health. You're doing great by checking in with yourself!");
  };

  const prepareMoodChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayEntries = moodHistory.filter(entry => 
        format(new Date(entry.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      const avgMood = dayEntries.length > 0 
        ? dayEntries.reduce((sum, entry) => sum + entry.mood_value, 0) / dayEntries.length
        : null;
      
      return {
        date: format(date, 'MMM dd'),
        mood: avgMood,
        entries: dayEntries.length
      };
    });
    
    return last7Days;
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Mood Tracker</h1>
        <p className="text-muted-foreground">How are you feeling today?</p>
      </div>

      <Card className="p-6 mb-6 bg-card shadow-card">
        <h2 className="text-lg font-semibold mb-4 text-center text-foreground">
          How are you feeling today?
        </h2>
        
        <div className="grid grid-cols-4 gap-3 mb-6">
          {moods.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setSelectedMood(mood.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-lg transition-all duration-300",
                "hover:scale-105 active:scale-95",
                selectedMood === mood.id
                  ? `bg-${mood.color}/20 ring-2 ring-${mood.color}`
                  : "hover:bg-muted/50"
              )}
            >
              <span className="text-3xl mb-1">{mood.emoji}</span>
              <span className="text-xs font-medium text-foreground">{mood.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <h3 className="text-md font-medium mb-2 text-foreground">Write your thoughts...</h3>
          <Textarea
            placeholder="What's on your mind today? Share your thoughts and feelings..."
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGetTip}
            disabled={!selectedMood}
            variant="outline"
            className="flex-1"
          >
            Get AI Tip
          </Button>
          <Button
            onClick={saveMoodEntry}
            disabled={!selectedMood || isSubmitting}
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-medium py-3 rounded-lg transition-all duration-300"
          >
            {isSubmitting ? 'Saving...' : 'Save Mood'}
          </Button>
        </div>
      </Card>

      {aiTip && (
        <Card className="p-4 bg-gradient-primary text-white shadow-soft">
          <h4 className="font-semibold mb-2">💡 Your Personalized Tip</h4>
          <p className="text-sm opacity-90">{aiTip}</p>
        </Card>
      )}

      {/* Mood History Chart */}
      {moodHistory.length > 0 && (
        <Card className="p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Your Mood Journey (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prepareMoodChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  domain={[0.5, 4.5]}
                  ticks={[1, 2, 3, 4]}
                  tickFormatter={(value) => {
                    const moodLabels = { 1: '😔', 2: '😐', 3: '🙂', 4: '😄' };
                    return moodLabels[value as keyof typeof moodLabels];
                  }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload[0]) {
                      const mood = payload[0].value as number;
                      const moodData = moods.find(m => m.value === Math.round(mood));
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">
                            Mood: {moodData?.emoji} {moodData?.label}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Track your emotional patterns to better understand your wellness journey
          </p>
        </Card>
      )}
    </div>
  );
};

export default MoodTracker;