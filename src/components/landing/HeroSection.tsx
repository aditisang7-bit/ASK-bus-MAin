import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import heroDashboard from "@/assets/hero-dashboard.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="container relative z-10 mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card mb-8"
            >
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Billing, Bookings & Growth in One Place</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight-custom leading-[0.95] mb-6">
              <span className="text-foreground">Run Your</span>
              <br />
              <span className="text-foreground">Business</span>
              <br />
              <span className="text-gradient">Smarter</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mb-10 leading-relaxed">
              Manage billing, bookings, customers, and inventory from one simple platform. Send invoices via WhatsApp and grow your business with ease.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/auth">
                <Button size="lg" className="hero-gradient text-primary-foreground font-semibold px-8 glow-primary hover:opacity-90 transition-opacity">
                  Start Free (No Credit Card)
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="font-semibold px-8 hover:bg-secondary border-border text-foreground">
                  View Plans
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">500+</span>
                <span>Businesses</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">₹2Cr+</span>
                <span>Invoices Sent</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">99.9%</span>
                <span>Uptime</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 hero-gradient rounded-full blur-[80px] opacity-20 scale-75" />
              <img
                src={heroDashboard}
                alt="ASK Business OS Dashboard"
                className="relative z-10 w-[500px] h-[500px] object-contain"
              />
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-12 top-1/4 glass-card rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Invoice Sent</p>
                  <p className="text-[10px] text-muted-foreground">₹15,000 via WhatsApp</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-8 bottom-1/3 glass-card rounded-xl p-3"
              >
                <p className="text-xs font-medium text-accent">Revenue ↑ 34%</p>
                <p className="text-[10px] text-muted-foreground">This month</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
