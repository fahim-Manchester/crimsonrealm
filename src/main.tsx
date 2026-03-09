import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MusicProvider } from "@/contexts/MusicContext";
import App from "@/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <MusicProvider>
      <App />
    </MusicProvider>
  </ThemeProvider>
);
