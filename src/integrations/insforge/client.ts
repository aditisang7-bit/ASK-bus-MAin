// This file is deprecated - migrate to @/integrations/supabase/client instead
export const insforge = new Proxy({
  auth: {},
  database: {},
  functions: {},
}, {
  get() {
    throw new Error("InsForge client is deprecated. Use Supabase client instead.");
  }
}) as any;
