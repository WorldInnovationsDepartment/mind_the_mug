// engine.ts — the plugin's own drawing code, imported as is. The video shows
// exactly what the mod draws: the same scenes, the same 40 x 20 pixels.
// @ts-expect-error plain JS module without types
import { Buf as BufImpl, W as WImpl, H as HImpl } from "../../../lib/pixels.js";
// @ts-expect-error plain JS module without types
import { MASCOTS as MASCOTS_IMPL, IDEA as IDEA_IMPL, WHY as WHY_IMPL, ideaFor as ideaForImpl } from "../../../lib/mascots.js";

export type Phase = "idle" | "start" | "work" | "reveal" | "abort" | "error";
export type Outcome = "none" | "feature" | "client" | "life";
export type MascotId = "cat" | "dog" | "hen" | "lake" | "oven";
export type SceneState = { phase: Phase; t0: number; outcome: Outcome; pulses: number[]; kept: Outcome[] };
export type PixelBuf = { get(x: number, y: number): string; set(x: number, y: number, c: string): void; spr(rows: string[], x: number, y: number, map: Record<string, string>): void };
type Mascot = {
  id: MascotId;
  name: string;
  tag: string;
  lesson: [string, string];
  dud: string;
  item: Record<Outcome, string>;
  scene: { draw(b: PixelBuf, st: SceneState, now: number): void };
};

export const W: number = WImpl;
export const H: number = HImpl;
export const MASCOTS: Record<MascotId, Mascot> = MASCOTS_IMPL;
export const IDEA: readonly [string, string] = IDEA_IMPL;
export const WHY: readonly [string, string] = WHY_IMPL;
export const ideaFor = (id: MascotId): [string, string] => ideaForImpl(id);
export const newBuf = (): PixelBuf => new BufImpl();
