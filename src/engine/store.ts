// Estado compartido de TradeChat (demo): mensajes (append-only), presencia,
// bajas y DMs dinámicos. Transporte BroadcastChannel + localStorage (dos
// ventanas). En producción: Supabase (Postgres + Realtime + RLS por dominio).
import { Message, Presence, Room } from "../model/types";

export interface ChatState {
  messages: Message[];          // append-only (log inmutable)
  presence: Record<string, Presence>;
  deactivated: string[];        // userIds dados de baja
  dmRooms: Room[];              // DMs creados en caliente
}

const KEY = "tradechat.state.v1";
const EMPTY: ChatState = { messages: [], presence: {}, deactivated: [], dmRooms: [] };

export class ChatStore {
  private ch: BroadcastChannel | null = null;
  private listeners = new Set<(s: ChatState) => void>();

  constructor() {
    try { this.ch = new BroadcastChannel("tradechat"); this.ch.onmessage = () => this.emit(); } catch { /* ignore */ }
    try { window.addEventListener("storage", (e) => { if (e.key === KEY) this.emit(); }); } catch { /* ignore */ }
  }

  state(): ChatState {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...EMPTY }; }
  }

  private write(s: ChatState) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
    try { this.ch?.postMessage("u"); } catch { /* ignore */ }
    this.emit();
  }

  post(m: Message): void {
    const s = this.state();
    s.messages = [...s.messages, m].slice(-1000);
    this.write(s);
  }

  setPresence(userId: string, p: Presence): void {
    const s = this.state();
    s.presence = { ...s.presence, [userId]: p };
    this.write(s);
  }

  setDeactivated(userId: string, off: boolean): void {
    const s = this.state();
    const set = new Set(s.deactivated);
    if (off) set.add(userId); else set.delete(userId);
    s.deactivated = [...set];
    this.write(s);
  }

  addDm(room: Room): void {
    const s = this.state();
    if (!s.dmRooms.find((r) => r.id === room.id)) { s.dmRooms = [...s.dmRooms, room]; this.write(s); }
  }

  reset(): void { this.write({ ...EMPTY }); }

  subscribe(cb: (s: ChatState) => void): () => void {
    this.listeners.add(cb);
    cb(this.state());
    return () => { this.listeners.delete(cb); };
  }

  private emit(): void { const s = this.state(); this.listeners.forEach((f) => f(s)); }
}

export function newId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/** Copia diaria (cierre de día) de una sala: texto plano para enviar a miembros + compliance. */
export function dailyDigest(roomTitle: string, msgs: Message[], recipients: string[]): string {
  const day = new Date().toISOString().slice(0, 10);
  const lines = msgs.map((m) => `[${new Date(m.ts).toLocaleTimeString("es-CL")}] ${m.senderName}${m.system ? " (sistema)" : ""}: ${m.text}`);
  return [
    `TradeChat — copia diaria supervisada`,
    `Sala: ${roomTitle}`,
    `Fecha: ${day}`,
    `Destinatarios: miembros de la sala + ${recipients.join(", ")}`,
    `Registro inmutable (${msgs.length} mensajes):`,
    ``,
    ...lines,
    ``,
    `— Comunicación privada supervisada por Control Interno / Compliance.`,
  ].join("\n");
}
