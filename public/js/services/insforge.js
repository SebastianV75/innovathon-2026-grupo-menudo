/**
 * InsForge SDK Client — ES Module
 * Loads the SDK from CDN, creates the client, and exposes it globally.
 * Dispatches auth lifecycle events for the app to consume.
 */
import { createClient } from 'https://esm.sh/@insforge/sdk@latest';

const INSFORGE_URL = 'https://47br95d3.us-east.insforge.app';
const INSFORGE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzU0Mjh9.8FTLRGYGstYPbRygk4SR_S8cJ4a-cjIUDFVf5ORi3a4';

const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

// Expose globally for non-module scripts
window.insforge = insforge;
window.INSFORGE_URL = INSFORGE_URL;

// Auth hydration: check for existing session on load
async function hydrateAuth() {
  window.dispatchEvent(new CustomEvent('auth-loading'));

  try {
    const { data, error } = await insforge.auth.getCurrentUser();
    const user = error ? null : (data?.user ?? null);
    window.currentUser = user;
    window.dispatchEvent(new CustomEvent('auth-ready', { detail: { user } }));
  } catch (err) {
    console.error('Auth hydration failed:', err);
    window.currentUser = null;
    window.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));
  }
}

hydrateAuth();
