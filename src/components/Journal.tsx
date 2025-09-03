import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Sparkles, Calendar, Plus, Send } from 'lucide-react';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  ai_analysis: string | null;
  ai_suggestion: string | null;
  created_at: string;
  updated_at: string;
}

const Journal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ title: '', content: '' });
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load journal entries',
        variant: 'destructive',
      });
    } else {
      setEntries(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEntry.content.trim()) return;

    setIsSubmitting(true);
    setIsAnalyzing(true);

    try {
      // Save the entry first
      const { data: entryData, error: entryError } = await supabase
        .from('journal_entries')
        .insert([
          {
            user_id: user.id,
            title: newEntry.title || null,
            content: newEntry.content,
          },
        ])
        .select()
        .single();

      if (entryError) throw entryError;

      // Get AI analysis
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        'journal-analysis',
        {
          body: {
            content: newEntry.content,
            entryId: entryData.id,
          },
        }
      );

      if (aiError) {
        console.error('AI analysis error:', aiError);
      }

      // Update the entry with AI analysis if successful
      if (aiData && !aiError) {
        await supabase
          .from('journal_entries')
          .update({
            ai_analysis: aiData.analysis,
            ai_suggestion: aiData.suggestion,
          })
          .eq('id', entryData.id);
      }

      setNewEntry({ title: '', content: '' });
      setShowNewEntry(false);
      fetchEntries();

      toast({
        title: 'Success',
        description: 'Journal entry saved successfully',
      });
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save journal entry',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Journal</h1>
            <p className="text-muted-foreground">Express your thoughts and feelings</p>
          </div>
        </div>
        <Button
          onClick={() => setShowNewEntry(!showNewEntry)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        {/* Left Column - Entry List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Your Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {showNewEntry && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                          <Label htmlFor="title">Title (optional)</Label>
                          <Input
                            id="title"
                            value={newEntry.title}
                            onChange={(e) =>
                              setNewEntry((prev) => ({ ...prev, title: e.target.value }))
                            }
                            placeholder="Give your entry a title..."
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <Label htmlFor="content">What's on your mind?</Label>
                          <Textarea
                            id="content"
                            value={newEntry.content}
                            onChange={(e) =>
                              setNewEntry((prev) => ({ ...prev, content: e.target.value }))
                            }
                            placeholder="Share your thoughts, feelings, or experiences..."
                            className="min-h-[100px] resize-none"
                            required
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            disabled={isSubmitting || !newEntry.content.trim()}
                            className="flex-1"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Save Entry
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewEntry(false)}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {entries.map((entry) => (
                  <Card
                    key={entry.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedEntry?.id === entry.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-foreground line-clamp-1">
                          {entry.title || 'Untitled Entry'}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {format(new Date(entry.created_at), 'MMM d')}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {entry.content}
                      </p>
                      {entry.ai_analysis && (
                        <div className="flex items-center gap-1 mt-2">
                          <Sparkles className="w-3 h-3 text-accent" />
                          <span className="text-xs text-accent">AI Insights Available</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {entries.length === 0 && !showNewEntry && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No entries yet. Start writing your first journal entry!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column - Selected Entry Details */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Entry Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEntry ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {selectedEntry.title || 'Untitled Entry'}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {format(new Date(selectedEntry.created_at), 'MMMM d, yyyy • h:mm a')}
                    </p>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground whitespace-pre-wrap">
                        {selectedEntry.content}
                      </p>
                    </div>
                  </div>

                  {isAnalyzing && selectedEntry.id && (
                    <Card className="bg-accent/10 border-accent/20">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-accent">Getting AI insights...</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedEntry.ai_analysis && (
                    <Card className="bg-accent/10 border-accent/20">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-accent mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          AI Reflection
                        </h4>
                        <p className="text-sm text-foreground mb-3">
                          {selectedEntry.ai_analysis}
                        </p>
                        {selectedEntry.ai_suggestion && (
                          <div>
                            <h5 className="font-medium text-accent mb-1">Suggested Reading</h5>
                            <p className="text-xs text-muted-foreground">
                              {selectedEntry.ai_suggestion}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select an entry to view AI insights and details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Journal;