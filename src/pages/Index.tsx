import { useState } from "react";
import { Navigate } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";
import ChatInterface from "@/components/ChatInterface";
import MoodTracker from "@/components/MoodTracker";
import LearningHub from "@/components/LearningHub";
import Journal from "@/components/Journal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");

  // Redirect to auth if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-calm flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "chat":
        return <ChatInterface />;
      case "mood":
        return <MoodTracker />;
      case "journal":
        return <Journal />;
      case "learn":
        return <LearningHub />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-calm flex flex-col">
      {/* Header with user info and logout */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-2">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <p className="font-medium text-foreground">{user?.user_metadata?.display_name || user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 pb-20 overflow-hidden">
        {renderContent()}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
