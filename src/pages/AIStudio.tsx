import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import DashboardLayout from "@/components/DashboardLayout";
import UpgradeBanner from "@/components/UpgradeBanner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AIStudio = () => {
  const { user, isGuest } = useAuth();
  const { checkLimit, enforceLimit, incrementUsage, currentPlan } = usePlan();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("business-advice");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const aiCheck = checkLimit("ai_usage");

  const handleGenerate = async () => {
    if (isGuest) { toast.error("Sign up to use AI Studio"); return; }
    if (!prompt.trim()) { toast.error("Enter a prompt"); return; }
    if (!enforceLimit("ai_usage", "AI generations")) return;

    setLoading(true);
    setResponse("");

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { prompt, mode },
      });
      if (error) throw error;
      setResponse(data?.response || "No response generated.");
      await incrementUsage("ai_usage");
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { value: "business-advice", label: "Business Advice" },
    { value: "marketing-copy", label: "Marketing Copy" },
    { value: "email-draft", label: "Email Draft" },
    { value: "social-caption", label: "Social Media Caption" },
    { value: "customer-reply", label: "Customer Reply" },
  ];

  return (
    <DashboardLayout title="AI Studio" subtitle="AI-powered business tools">
      {!aiCheck.allowed && (
        <UpgradeBanner resource="AI generations" current={aiCheck.current} max={aiCheck.max} plan={currentPlan} />
      )}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" /> AI Assistant
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {modes.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Your Prompt</Label>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} placeholder="e.g. Write a WhatsApp message for a Diwali sale..." className="bg-input border-border text-foreground" />
              </div>
              <Button onClick={handleGenerate} disabled={loading} className="w-full hero-gradient text-primary-foreground font-semibold">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Send className="w-4 h-4 mr-2" /> Generate</>}
              </Button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 min-h-[300px]">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">AI Response</h3>
          {response ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">{response}</pre>
              <Button size="sm" variant="outline" className="mt-4 border-border text-foreground" onClick={() => { navigator.clipboard.writeText(response); toast.success("Copied!"); }}>
                Copy to Clipboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">AI response will appear here</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIStudio;
