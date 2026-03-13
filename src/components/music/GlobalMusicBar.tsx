import { useAuth } from "@/hooks/useAuth";
import MusicPlayer from "./MusicPlayer";

const GlobalMusicBar = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <MusicPlayer />
    </div>
  );
};

export default GlobalMusicBar;
