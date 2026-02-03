

## Fix: React "useEffect" Error

The error `Cannot read properties of null (reading 'useEffect')` is caused by **duplicate React instances** in the bundle. This is a common issue with Vite and libraries like `@tanstack/react-query`.

### The Problem
When Vite pre-bundles dependencies, it can accidentally include multiple copies of React. When different copies try to share internal state (like the hooks dispatcher), one copy sees `null` where it expects the other's data.

### The Solution
Update `vite.config.ts` to tell Vite to deduplicate React packages:

---

### Technical Changes

**File: `vite.config.ts`**

Add two configurations:
1. **`resolve.dedupe`** - Forces Vite to use a single copy of React
2. **`optimizeDeps.include`** - Ensures `@tanstack/react-query` is properly bundled

```text
// Add to the existing config:
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
  dedupe: ["react", "react-dom", "react/jsx-runtime"],  // <-- NEW
},
optimizeDeps: {
  include: ["@tanstack/react-query"],  // <-- NEW
},
```

This is a simple one-file fix that should immediately resolve the blank screen error.

