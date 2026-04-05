// This file is DEPRECATED. Use @/integrations/insforge/client instead.
export const supabase = new Proxy({}, {
  get() {
    throw new Error("Supabase is deprecated in this project. Use insforge instead.");
  }
}) as any;