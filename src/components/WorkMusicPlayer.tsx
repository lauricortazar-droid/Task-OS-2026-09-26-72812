import React, { useState, useEffect, useRef } from "react";
import {
  Music,
  Disc,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Plus,
  Trash2,
  HardDrive,
  FolderOpen,
  X,
  SkipForward,
  SkipBack,
  BellOff,
  Check,
  Headphones,
  Link,
  ChevronUp,
  ChevronDown,
  Timer,
} from "lucide-react";
import { MusicPlatform, WorkPlaylist, WorkspaceTab } from "../types";
import { playChime } from "../utils/audio";

const STORAGE_KEY_MUSIC_STATE = "task_os_work_music_v2";
const STORAGE_KEY_CUSTOM_PLAYLISTS = "task_os_custom_playlists_v2";
const STORAGE_KEY_PAUSE_ON_POMODORO = "task_os_pause_music_on_pomodoro";

interface LocalAudioTrack {
  id: string;
  name: string;
  url: string;
}

const DEFAULT_PRESETS: WorkPlaylist[] = [
  // Suno AI Presets
  {
    id: "suno-focus-instrumental",
    title: "Suno AI • Banda Sonora de Máxima Concentración",
    platform: "suno",
    url: "https://suno.com",
    embedUrl: "https://suno.com",
    description: "Pistas y música instrumental generada en Suno AI para sesiones de enfoque.",
  },
  // Spotify Presets
  {
    id: "spot-deep-focus",
    title: "Deep Focus (Instrumental & Ambient)",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
    description: "Música instrumental serena para concentración profunda sin distracciones.",
  },
  {
    id: "spot-lofi-beats",
    title: "Lo-Fi Beats para Trabajar",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DXc8kgYqQLMfH",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXc8kgYqQLMfH?utm_source=generator&theme=0",
    description: "Ritmos suaves lofi ideales para tareas de diseño y redacción.",
  },
  {
    id: "spot-piano-focus",
    title: "Peaceful Piano Clásico",
    platform: "spotify",
    url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0",
    description: "Piezas de piano relajantes para máxima claridad mental.",
  },
  // YouTube Music Presets
  {
    id: "yt-lofi-live",
    title: "Lofi Girl — Beats to Relax/Study to",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=jfKfPfyJRdk",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0",
    description: "Transmisión continua de lofi chill hip-hop para trabajar.",
  },
  {
    id: "yt-classical-focus",
    title: "Música Clásica para Alta Concentración",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=WPni755-Krg",
    embedUrl: "https://www.youtube.com/embed/WPni755-Krg?autoplay=1",
    description: "Mozart, Bach y Chopin seleccionados para potenciar el enfoque.",
  },
  {
    id: "yt-ambient-synth",
    title: "Synthwave / Chillwave Productivo",
    platform: "youtube",
    url: "https://music.youtube.com/watch?v=4xDzrJKXOOY",
    embedUrl: "https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1",
    description: "Atmósferas electrónicas retro y suaves de alta productividad.",
  },
  // Google Drive Presets
  {
    id: "gdrive-sample",
    title: "Carpeta de Audio (Google Drive)",
    platform: "gdrive",
    url: "https://drive.google.com",
    embedUrl: "",
    description: "Pega el enlace de tu carpeta de Google Drive para reproducir tus audios aquí.",
    isCustom: true,
  },
];

interface WorkMusicPlayerProps {
  isPomodoroActive?: boolean;
  currentWorkspace?: WorkspaceTab;
  onNavigateToPomodoro?: () => void;
}

export default function WorkMusicPlayer({
  isPomodoroActive = false,
  currentWorkspace = "task-os",
  onNavigateToPomodoro,
}: WorkMusicPlayerProps) {
  const [activePlatform, setActivePlatform] = useState<MusicPlatform>("spotify");
  const [currentPlaylist, setCurrentPlaylist] = useState<WorkPlaylist>(DEFAULT_PRESETS[1]);
  const [customPlaylists, setCustomPlaylists] = useState<WorkPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_PLAYLISTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // Local phone / computer folder tracks
  const [localTracks, setLocalTracks] = useState<LocalAudioTrack[]>([]);
  const [localFolderTitle, setLocalFolderTitle] = useState<string>("Carpeta Local");
  const [currentLocalTrackIndex, setCurrentLocalTrackIndex] = useState<number>(0);
  const [isLocalPlaying, setIsLocalPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMiniDockCollapsed, setIsMiniDockCollapsed] = useState(false);

  // Preference: pause music when pomodoro alarm sounds
  const [pauseOnPomodoroAlarm, setPauseOnPomodoroAlarm] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAUSE_ON_POMODORO);
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });

  const [pomodoroPauseNotice, setPomodoroPauseNotice] = useState<string | null>(null);

  // Form to add custom play links
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState<MusicPlatform>("spotify");
  const [isAddingFeedback, setIsAddingFeedback] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isPomodoroTab = currentWorkspace === "pomodoro" || isPomodoroActive;

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MUSIC_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentPlaylist) {
          setCurrentPlaylist(parsed.currentPlaylist);
          setActivePlatform(parsed.currentPlaylist.platform);
        }
      }
    } catch (_) {}
  }, []);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_MUSIC_STATE,
        JSON.stringify({
          currentPlaylist,
          activePlatform,
        })
      );
    } catch (_) {}
  }, [currentPlaylist, activePlatform]);

  // Persist pauseOnPomodoroAlarm
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAUSE_ON_POMODORO, JSON.stringify(pauseOnPomodoroAlarm));
    } catch (_) {}
  }, [pauseOnPomodoroAlarm]);

  // Listen to pomodoro-alarm-fired event
  useEffect(() => {
    const handlePomodoroAlarm = () => {
      if (pauseOnPomodoroAlarm) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsLocalPlaying(false);
        }
        setPomodoroPauseNotice("Música pausada por finalización de ciclo Pomodoro");
        setTimeout(() => setPomodoroPauseNotice(null), 5000);
      }
    };

    window.addEventListener("pomodoro-alarm-fired", handlePomodoroAlarm);
    return () => window.removeEventListener("pomodoro-alarm-fired", handlePomodoroAlarm);
  }, [pauseOnPomodoroAlarm]);

  // Helper to parse embed URLs
  const parseEmbedUrl = (url: string, platform: MusicPlatform): { embedUrl: string; directUrl: string } => {
    const cleanUrl = url.trim();

    if (platform === "suno") {
      const songMatch = cleanUrl.match(/song\/([a-zA-Z0-9_-]+)/);
      if (songMatch) {
        return {
          embedUrl: `https://suno.com/embed/${songMatch[1]}`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    if (platform === "spotify") {
      const match = cleanUrl.match(/(playlist|track|album|show|episode)\/([a-zA-Z0-9]+)/);
      if (match) {
        const type = match[1];
        const id = match[2];
        return {
          embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    if (platform === "youtube") {
      let videoId = "";
      let listId = "";
      const listMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (listMatch) listId = listMatch[1];
      const videoMatch = cleanUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      if (videoMatch) videoId = videoMatch[1];

      if (listId) {
        return {
          embedUrl: `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`,
          directUrl: cleanUrl,
        };
      }
      if (videoId) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    if (platform === "gdrive") {
      const folderMatch = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (folderMatch) {
        const folderId = folderMatch[1];
        return {
          embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
          directUrl: cleanUrl,
        };
      }
      const fileMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        const fileId = fileMatch[1];
        return {
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          directUrl: cleanUrl,
        };
      }
      return { embedUrl: cleanUrl, directUrl: cleanUrl };
    }

    return { embedUrl: cleanUrl, directUrl: cleanUrl };
  };

  const autoDetectPlatform = (url: string): MusicPlatform => {
    const lower = url.toLowerCase();
    if (lower.includes("suno.com")) return "suno";
    if (lower.includes("spotify.com")) return "spotify";
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
    if (lower.includes("drive.google.com")) return "gdrive";
    return "web";
  };

  // Add custom play link
  const handleAddCustomPlayLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const detected = autoDetectPlatform(newUrl);
    const platformToUse = newPlatform || detected;
    const { embedUrl, directUrl } = parseEmbedUrl(newUrl, platformToUse);

    const titleToUse =
      newTitle.trim() ||
      (platformToUse === "suno"
        ? "Pista Suno AI"
        : platformToUse === "spotify"
        ? "Playlist de Spotify"
        : platformToUse === "youtube"
        ? "Sesión de YouTube"
        : platformToUse === "gdrive"
        ? "Carpeta Google Drive"
        : "Link de Audio");

    const newPlayItem: WorkPlaylist = {
      id: `play-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: titleToUse,
      platform: platformToUse,
      url: directUrl,
      embedUrl,
      description: `Agregado por ti para Modo Enfoque (${platformToUse})`,
      isCustom: true,
    };

    const updated = [newPlayItem, ...customPlaylists];
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLAYLISTS, JSON.stringify(updated));
    } catch (_) {}

    // Immediately select and play it
    setCurrentPlaylist(newPlayItem);
    setActivePlatform(platformToUse);

    setNewUrl("");
    setNewTitle("");
    setShowAddLinkForm(false);
    setIsAddingFeedback(`¡"${titleToUse}" guardado y listo para reproducir!`);
    playChime("success");
    setTimeout(() => setIsAddingFeedback(null), 4000);
  };

  const handleDeleteCustomPlayLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPlaylists.filter((p) => p.id !== id);
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLAYLISTS, JSON.stringify(updated));
    } catch (_) {}
    if (currentPlaylist.id === id) {
      setCurrentPlaylist(DEFAULT_PRESETS[1]);
      setActivePlatform(DEFAULT_PRESETS[1].platform);
    }
  };

  // Handle local folder selection
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles: LocalAudioTrack[] = [];
    const validExtensions = [".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac", ".mp4", ".weba"];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      if (validExtensions.some((ext) => lower.endsWith(ext))) {
        const objectUrl = URL.createObjectURL(file);
        audioFiles.push({
          id: `track-${i}-${file.name}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: objectUrl,
        });
      }
    }

    if (audioFiles.length > 0) {
      setLocalTracks(audioFiles);
      setCurrentLocalTrackIndex(0);
      setActivePlatform("local");
      const folderName =
        // @ts-ignore
        files[0]?.webkitRelativePath?.split("/")[0] || "Carpeta Seleccionada";
      setLocalFolderTitle(folderName);

      if (audioRef.current) {
        audioRef.current.src = audioFiles[0].url;
        audioRef.current.play().then(() => setIsLocalPlaying(true)).catch(() => {});
      }
    }
  };

  const toggleLocalPlayPause = () => {
    if (!audioRef.current) return;
    if (isLocalPlaying) {
      audioRef.current.pause();
      setIsLocalPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsLocalPlaying(true)).catch(() => {});
    }
  };

  const handleNextLocalTrack = () => {
    if (localTracks.length === 0) return;
    const nextIdx = (currentLocalTrackIndex + 1) % localTracks.length;
    setCurrentLocalTrackIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.src = localTracks[nextIdx].url;
      audioRef.current.play().then(() => setIsLocalPlaying(true)).catch(() => {});
    }
  };

  const handlePrevLocalTrack = () => {
    if (localTracks.length === 0) return;
    const prevIdx = (currentLocalTrackIndex - 1 + localTracks.length) % localTracks.length;
    setCurrentLocalTrackIndex(prevIdx);
    if (audioRef.current) {
      audioRef.current.src = localTracks[prevIdx].url;
      audioRef.current.play().then(() => setIsLocalPlaying(true)).catch(() => {});
    }
  };

  const allPlaylists = [...DEFAULT_PRESETS, ...customPlaylists];
  const filteredPlaylists = allPlaylists.filter((p) => p.platform === activePlatform);

  return (
    <>
      {/* 1. Permanent Audio Engine (Never unmounted across tabs) */}
      <audio
        ref={audioRef}
        onEnded={handleNextLocalTrack}
        onPause={() => setIsLocalPlaying(false)}
        onPlay={() => setIsLocalPlaying(true)}
      />

      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderSelect}
        // @ts-ignore
        webkitdirectory="true"
        // @ts-ignore
        directory="true"
        multiple
        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
        className="hidden"
      />

      {/* 2. When in Pomodoro Tab: Full Bottom Docked Section */}
      {isPomodoroTab ? (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 mb-16">
          <div className="w-full rounded-3xl bg-stone-900 text-stone-100 border border-stone-800 p-5 space-y-4 shadow-xl text-xs mt-6 animate-in fade-in">
            {/* Header bar: Title & Play notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Headphones size={18} />
              </div>
              <div>
                <h4 className="font-bold text-stone-100 text-sm flex items-center gap-2">
                  <span>Música en Modo Enfoque</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    • Sonando en todo el portal
                  </span>
                </h4>
                <p className="text-[11px] text-stone-400">
                  La música continúa reproduciéndose sin cortarse aunque navegues a otras pestañas (Task, Lonas, Finanzas, etc.).
                </p>
              </div>
            </div>

            {/* Action: Open form to put my play links */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddLinkForm(!showAddLinkForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-transform active:scale-95"
                title="Poner mis links de Play (Suno, Spotify, YouTube, Drive)"
              >
                <Plus size={14} />
                <span>Poner mi Link de Play</span>
              </button>
            </div>
          </div>

          {/* Notification if pomodoro paused music */}
          {pomodoroPauseNotice && (
            <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-2 animate-in fade-in">
              <BellOff size={14} />
              <span>{pomodoroPauseNotice}</span>
            </div>
          )}

          {/* Feedback banner */}
          {isAddingFeedback && (
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <Check size={14} />
              <span>{isAddingFeedback}</span>
            </div>
          )}

          {/* FORM: "Poner mis links de Play" */}
          {showAddLinkForm && (
            <form
              onSubmit={handleAddCustomPlayLink}
              className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-700/80 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Link size={13} className="text-amber-400" />
                  Agregar Mi Enlace de Reproducción
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddLinkForm(false)}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Pega tu Link (Suno AI, Spotify, YouTube / Music, Google Drive o MP3 web):
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://open.spotify.com/playlist/... o https://suno.com/song/... o https://music.youtube.com/..."
                    value={newUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUrl(val);
                      setNewPlatform(autoDetectPlatform(val));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                      Nombre de tu Playlist o Canción:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Mi lista de enfoque rápido, Suno Lo-Fi..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                      Plataforma Detectada:
                    </label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value as MusicPlatform)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="spotify">Spotify</option>
                      <option value="youtube">YouTube / YouTube Music</option>
                      <option value="suno">Suno AI</option>
                      <option value="gdrive">Google Drive</option>
                      <option value="web">Audio Web / Streaming</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddLinkForm(false)}
                  className="px-3 py-1.5 text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-xs"
                >
                  + Guardar y Reproducir
                </button>
              </div>
            </form>
          )}

          {/* Platform selector tabs */}
          <div className="flex items-center gap-1 p-1 bg-stone-950/80 rounded-xl border border-stone-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActivePlatform("spotify")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activePlatform === "spotify"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>Spotify</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform("youtube")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activePlatform === "youtube"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>YouTube</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform("suno")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activePlatform === "suno"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>Suno AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform("gdrive")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activePlatform === "gdrive"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>Google Drive</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform("local")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                activePlatform === "local"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>Carpeta Local</span>
            </button>
          </div>

          {/* Playlist / Link Quick Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-stone-400 font-semibold">
              <span>Estaciones y Links Disponibles:</span>
              <span>{filteredPlaylists.length} opciones</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredPlaylists.map((p) => {
                const isSelected = currentPlaylist.id === p.id && activePlatform === p.platform;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setCurrentPlaylist(p);
                      setActivePlatform(p.platform);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-stone-800 border-amber-500/80 shadow-xs"
                        : "bg-stone-950/60 border-stone-800 hover:bg-stone-800/60 text-stone-300"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-amber-500 text-stone-950 font-bold" : "bg-stone-800 text-stone-400"
                        }`}
                      >
                        <Play size={11} className={isSelected ? "fill-current" : ""} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-100 truncate text-[11px]">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {p.isCustom ? "Link personalizado" : p.description}
                        </div>
                      </div>
                    </div>

                    {p.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomPlayLink(p.id, e)}
                        className="p-1 text-stone-500 hover:text-rose-400 rounded transition-colors"
                        title="Eliminar este link de play"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embedded Active Player in Pomodoro view */}
          <div className="pt-2 border-t border-stone-800">
            {activePlatform === "local" ? (
              <div className="p-3 bg-stone-950/80 rounded-xl space-y-3">
                {localTracks.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-amber-400 truncate">
                          {localTracks[currentLocalTrackIndex]?.name}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {localFolderTitle} ({currentLocalTrackIndex + 1} de {localTracks.length})
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePrevLocalTrack}
                          className="p-1.5 text-stone-300 hover:text-white"
                        >
                          <SkipBack size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={toggleLocalPlayPause}
                          className="p-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs"
                        >
                          {isLocalPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleNextLocalTrack}
                          className="p-1.5 text-stone-300 hover:text-white"
                        >
                          <SkipForward size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3 space-y-2">
                    <FolderOpen size={24} className="text-amber-400 mx-auto" />
                    <p className="text-xs text-stone-300">
                      Selecciona una carpeta con archivos MP3 / audio en tu celular o PC.
                    </p>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400"
                    >
                      Elegir Carpeta
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-black border border-stone-800">
                {activePlatform === "spotify" && (
                  <iframe
                    src={currentPlaylist.embedUrl}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title="Spotify Embed Focus Player"
                  />
                )}

                {activePlatform === "youtube" && (
                  <div className="relative aspect-video max-h-56 w-full">
                    <iframe
                      src={currentPlaylist.embedUrl}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                      title="YouTube Focus Player"
                    />
                  </div>
                )}

                {activePlatform === "suno" && (
                  <div className="p-4 text-center space-y-3 bg-stone-950/90">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center font-bold">
                      Suno
                    </div>
                    <div>
                      <h5 className="font-bold text-stone-200 text-xs">{currentPlaylist.title}</h5>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {currentPlaylist.url}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={currentPlaylist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs"
                      >
                        <span>Abrir y Reproducir en Suno AI</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {activePlatform === "gdrive" && (
                  <div className="p-4 text-center space-y-3 bg-stone-950/90">
                    <HardDrive size={24} className="text-blue-400 mx-auto" />
                    <h5 className="font-bold text-stone-200 text-xs">{currentPlaylist.title}</h5>
                    <a
                      href={currentPlaylist.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                    >
                      <ExternalLink size={12} />
                      Abrir Carpeta en Google Drive
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer controls: Volume + Pomodoro Alarm Checkbox */}
          <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-stone-400">
            <label
              className="flex items-center gap-1.5 cursor-pointer text-stone-300 hover:text-white"
              title="Pausar música automáticamente cuando termine el pomodoro o suene la alarma"
            >
              <input
                type="checkbox"
                checked={pauseOnPomodoroAlarm}
                onChange={(e) => setPauseOnPomodoroAlarm(e.target.checked)}
                className="rounded border-stone-700 bg-stone-900 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
              />
              <span>Pausar música al terminar el ciclo Pomodoro</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="text-stone-400 hover:text-stone-200"
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* 3. When in Other Tabs (Task-OS, Lonas, Finanzas, URLs, Print, Analytics):
              The music continues playing! Renders a persistent, elegant Mini-Dock Bar */
        <div className="fixed bottom-16 sm:bottom-4 right-3 sm:right-5 z-40 max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-stone-900/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-100 border border-stone-700/80 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3">
            {/* Spinning Disc & Track Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Disc
                  size={18}
                  className="animate-spin"
                  style={{ animationDuration: "4s" }}
                />
              </div>

              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-stone-100 flex items-center gap-1.5">
                  <span className="truncate">
                    {activePlatform === "local" && localTracks[currentLocalTrackIndex]
                      ? localTracks[currentLocalTrackIndex].name
                      : currentPlaylist.title}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 flex items-center gap-1.5">
                  <span className="uppercase text-amber-400 font-extrabold text-[9px]">
                    {activePlatform === "local" ? "Local" : currentPlaylist.platform}
                  </span>
                  <span>·</span>
                  <span className="text-emerald-400 font-medium">Música Activa</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Pomodoro Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              {activePlatform === "local" && (
                <button
                  type="button"
                  onClick={toggleLocalPlayPause}
                  className="p-1.5 rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400"
                  title={isLocalPlaying ? "Pausar" : "Reanudar"}
                >
                  {isLocalPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                </button>
              )}

              {onNavigateToPomodoro && (
                <button
                  type="button"
                  onClick={onNavigateToPomodoro}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-transform active:scale-95"
                  title="Abrir reproductor completo en Pomodoro"
                >
                  <Timer size={13} />
                  <span>Pomodoro</span>
                </button>
              )}
            </div>
          </div>

          {/* Hidden persistent iframe container when in other tabs so audio does not reload or stop */}
          <div className="sr-only pointer-events-none" aria-hidden="true">
            {activePlatform === "spotify" && (
              <iframe
                src={currentPlaylist.embedUrl}
                width="1"
                height="1"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                title="Persistent Spotify Player"
              />
            )}
            {activePlatform === "youtube" && (
              <iframe
                src={currentPlaylist.embedUrl}
                width="1"
                height="1"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                title="Persistent YouTube Player"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
