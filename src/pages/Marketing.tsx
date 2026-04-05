import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Image, Download, Share2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { insforge } from "@/integrations/insforge/client";

const platforms = [
  { value: "instagram-post", label: "Instagram Post (1080×1080)" },
  { value: "instagram-story", label: "Instagram Story (1080×1920)" },
  { value: "whatsapp-status", label: "WhatsApp Status (1080×1920)" },
  { value: "facebook-post", label: "Facebook Post (1200×630)" },
  { value: "linkedin-post", label: "LinkedIn Post (1200×627)" },
];

const categories = [
  { value: "offer", label: "Offer / Discount" },
  { value: "festival", label: "Festival Greeting" },
  { value: "promotion", label: "Business Promotion" },
  { value: "product", label: "Product Showcase" },
  { value: "announcement", label: "Announcement" },
];

const Marketing = () => {
  const { user, isGuest } = useAuth();
  const [platform, setPlatform] = useState("instagram-post");
  const [category, setCategory] = useState("offer");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (isGuest) {
      toast.error("Sign up to use the AI Banner Generator");
      return;
    }
    if (!businessName || !description) {
      toast.error("Please fill in business name and description");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await insforge.functions.invoke("generate-banner", {
        body: { platform, category, businessName, description, contact },
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success("Banner generated!");
      } else {
        toast.info("Banner generation is being set up. Please check back soon.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate banner");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `banner-${Date.now()}.png`;
    a.click();
  };

  const handleShare = () => {
    if (!generatedImage) return;
    if (navigator.share) {
      navigator.share({ title: "Banner", url: generatedImage });
    } else {
      navigator.clipboard.writeText(generatedImage);
      toast.success("Image URL copied to clipboard");
    }
  };

  return (
    <DashboardLayout title="Marketing" subtitle="AI-powered banner & campaign tools">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Generator form */}
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" /> AI Banner Generator
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your Business Name" className="bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Description / Offer</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 50% off on all services this weekend!" className="bg-input border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Contact Info</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone, website, or address" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {platforms.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full hero-gradient text-primary-foreground font-semibold">
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Banner</>}
              </Button>
            </div>
          </div>

          {/* Templates */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Templates</h3>
            <div className="grid grid-cols-2 gap-2">
              {["Diwali Offer", "New Year Sale", "Grand Opening", "Festival Greetings"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setDescription(t); setCategory("festival"); }}
                  className="text-xs px-3 py-2 rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center min-h-[400px]">
          {generatedImage ? (
            <div className="space-y-4 w-full">
              <img src={generatedImage} alt="Generated Banner" className="w-full rounded-lg" />
              <div className="flex gap-2">
                <Button onClick={handleDownload} variant="outline" className="flex-1 border-border text-foreground">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button onClick={handleShare} variant="outline" className="flex-1 border-border text-foreground">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Image className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Your generated banner will appear here</p>
              <p className="text-xs mt-1">Fill the form and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Marketing;
