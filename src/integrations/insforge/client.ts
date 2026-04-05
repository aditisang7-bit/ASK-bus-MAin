import { createClient } from "@insforge/sdk";

// Using hardcoded values to ensure connection to InsForge
const BASE_URL = "https://g2sjga5r.ap-southeast.insforge.app";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTQ1NjJ9.8BNdGP0C7cexj2qaVHcp77UZKIbM56JzdYuYrP7lMDY";

export const insforge = createClient({
  baseUrl: BASE_URL,
  anonKey: ANON_KEY,
});
