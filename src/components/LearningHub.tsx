import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Star, Trophy, Lightbulb } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const LearningHub = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [revealedItems, setRevealedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
  }, [user]);

  const fetchUserPoints = async () => {
    const { data, error } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Error fetching points:', error);
    } else {
      setUserPoints(data?.points || 0);
    }
  };

  const awardPoints = async () => {
    if (!user || revealedItems.has(currentIndex)) return;

    try {
      // First check if user_points record exists
      const { data: existing } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id)
        .single();

      const currentPoints = existing?.points || 0;
      const newPoints = currentPoints + 10;

      const { error } = await supabase
        .from('user_points')
        .upsert([
          {
            user_id: user.id,
            points: newPoints,
          },
        ]);

      if (!error) {
        setUserPoints(newPoints);
        setRevealedItems(prev => new Set([...prev, currentIndex]));
        toast({
          title: "Great job! 🎉",
          description: "You earned 10 points for learning something new!",
        });
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const mythsFacts = [
    {
      myth: "Talking about mental health means you're weak",
      fact: "Seeking help shows courage and self-awareness. Mental health struggles are common and treatable.",
      emoji: "💪"
    },
    {
      myth: "Only people with severe problems need mental health support",
      fact: "Mental wellness is for everyone. Taking care of your mind is as important as physical health.",
      emoji: "🧠"
    },
    {
      myth: "Stress and anxiety are just part of being a student",
      fact: "While some stress is normal, persistent anxiety affects learning and well-being. Support is available.",
      emoji: "🎓"
    },
    {
      myth: "Meditation and relaxation are just trends",
      fact: "Mindfulness practices are scientifically proven to reduce stress, improve focus, and enhance emotional regulation.",
      emoji: "🧘"
    },
    {
      myth: "Mental health problems are permanent",
      fact: "With proper support, therapy, and sometimes medication, most mental health conditions are treatable and manageable.",
      emoji: "🌱"
    },
    {
      myth: "You should be able to handle everything on your own",
      fact: "Humans are social beings. Seeking support from friends, family, or professionals is healthy and normal.",
      emoji: "🤝"
    }
  ];

  const currentItem = mythsFacts[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mythsFacts.length);
    setIsRevealed(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mythsFacts.length) % mythsFacts.length);
    setIsRevealed(false);
  };

  const handleReveal = () => {
    setIsRevealed(true);
    if (user && !revealedItems.has(currentIndex)) {
      awardPoints();
    }
  };

  const progressPercentage = Math.round((revealedItems.size / mythsFacts.length) * 100);

  return (
    <div className="p-6 max-w-md mx-auto min-h-screen flex flex-col">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-warning" />
            <span className="text-lg font-semibold text-foreground">{userPoints}</span>
            <span className="text-sm text-muted-foreground">points</span>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {revealedItems.size}/{mythsFacts.length} completed
          </Badge>
        </div>
        <Progress value={progressPercentage} className="mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Learning Hub</h1>
        <p className="text-muted-foreground">Debunking Mental Health Myths</p>
      </div>

      <div className="relative mb-6">
        <Button
          onClick={handlePrev}
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 rounded-full bg-card shadow-card"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          onClick={handleNext}
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 rounded-full bg-card shadow-card"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Card className="p-6 bg-card shadow-card min-h-[300px] flex flex-col justify-center">
          <div className="text-center mb-4">
            <div className="text-4xl mb-3">{currentItem.emoji}</div>
            <div className={cn(
              "inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4",
              !isRevealed ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
            )}>
              {!isRevealed ? "MYTH" : "FACT"}
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-foreground text-lg leading-relaxed">
              {!isRevealed ? `"${currentItem.myth}"` : currentItem.fact}
            </p>
          </div>

          {!isRevealed && (
            <Button
              onClick={handleReveal}
              className={cn(
                "mx-auto px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105",
                revealedItems.has(currentIndex) 
                  ? "bg-success/20 text-success border-success" 
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              disabled={revealedItems.has(currentIndex)}
            >
              {revealedItems.has(currentIndex) ? "✓ Already revealed" : "Tap to reveal the fact"}
            </Button>
          )}
        </Card>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {mythsFacts.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentIndex ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Lightbulb className="w-4 h-4" />
        <span>Swipe or use arrows to explore more myths & facts</span>
      </div>
    </div>
  );
};

export default LearningHub;