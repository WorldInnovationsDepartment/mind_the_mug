// theme3.ts — single source of truth for the third launch video (the mascots).
// Daylight, not neon: pastel grounds, one dark ink, one hero colour per frame
// (coral on light scenes, the cat's-eye yellow on the dark one). Colours,
// easings, springs and fonts live here and nowhere else.
import { Easing } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const display = loadDisplay("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const t3 = {
  colors: {
    paper: "#fbf7fd",
    ink: "#2d2733", // the cat
    inkSoft: "#6b6275",
    hero: "#d9603b", // coral: THE hero colour on light scenes
    heroDark: "#ffd84a", // the cat's eyes: THE hero colour on the dark scene
    night: "#241f2b",
    nightSoft: "#a79db3",
    white: "#ffffff",
    card: "#ffffff",
    shadow: "rgba(72, 44, 98, 0.28)",
    term: "#17151c",
    termLine: "#3a3542",
    termText: "#ece8f1",
    termDim: "#8d8598",
    termGreen: "#7ee787",
    termOrange: "#d97757",
  },
  /** Scene grounds: [base, glow A, glow B]. */
  grounds: {
    cat: ["#f3e6f7", "#e2c8ee", "#ffe9c9"],
    dog: ["#e3f5ff", "#bfe9c0", "#fff1b8"],
    hen: ["#fff3d2", "#ffd9a8", "#d9efb0"],
    lake: ["#e2f6fb", "#a9e0ee", "#ffd9b8"],
    oven: ["#fff5e6", "#ffdcae", "#c9f0e1"],
    night: ["#241f2b", "#4a2f66", "#6b3a2a"],
  },
  /** The cat's mug, for the pile on the desk (same colours as the scene's own). */
  mug: { rows: ["bbb.", "wwwh", "www.", "www."], map: { b: "#4f8fe0", w: "#ffffff", h: "#cfd8dd" } },
  fonts: {
    display: `${display.fontFamily}, 'Arial Rounded MT Bold', 'Arial Black', sans-serif`,
    mono: `${mono.fontFamily}, Menlo, monospace`,
  },
  // THE easing curves. Linear is forbidden.
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    hard: { damping: 18, stiffness: 340, mass: 0.5 }, // slams: settles in ~8 frames
    snappy: { damping: 14, stiffness: 180, mass: 0.6 },
    bouncy: { damping: 9, stiffness: 190, mass: 0.6 }, // pops: one overshoot
  },
} as const;

export type GroundId = keyof typeof t3.grounds;
