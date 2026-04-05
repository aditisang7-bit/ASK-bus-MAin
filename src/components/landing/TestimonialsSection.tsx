import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Salon Owner, Mumbai",
    text: "ASK Business OS transformed how I manage my salon. Booking, billing, and WhatsApp reminders — all in one place. My no-shows dropped by 60%!",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "Retail Store Owner, Delhi",
    text: "The GST invoicing and inventory tracking saved me hours every week. The AI banner generator is a game-changer for my social media marketing.",
    rating: 5,
  },
  {
    name: "Anita Patel",
    role: "Freelance Designer, Bangalore",
    text: "I use the CRM and billing modules daily. Being able to send invoices via WhatsApp with one click has improved my payment collection by 40%.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section className="relative py-32">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight-custom mb-4">
            Loved by <span className="text-gradient">businesses</span>
          </h2>
          <p className="text-muted-foreground text-lg">See what our users are saying</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.text}"</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
