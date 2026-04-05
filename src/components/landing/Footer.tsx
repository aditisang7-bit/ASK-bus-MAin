import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ASK Business Manager" className="h-6 w-6 object-contain" />
            <span className="font-semibold text-sm text-foreground">ASK Business Manager</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 ASK Business Manager. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

