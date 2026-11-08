// ChatPolicy — reglas puras que hacen cumplir la invariante:
//   En toda sala: (a) todos los clientes son de la MISMA empresa (por dominio),
//   y (b) hay al menos una MESA (dueño) presente.
// Todo lo demás (ver sala, postear, autotrade, baja, compliance) sale de acá.
import { Company, Presence, Room, User } from "./types";

export function domainOf(email: string): string {
  return (email.split("@")[1] ?? "").trim().toLowerCase();
}

/** Empresa a la que pertenece un dominio corporativo (o null si no está en ningún allowlist). */
export function companyByDomain(domain: string, companies: Company[]): Company | null {
  return companies.find((c) => c.domains.map((d) => d.toLowerCase()).includes(domain)) ?? null;
}

const FREE_DOMAINS = new Set(["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me"]);
export function isFreeDomain(domain: string): boolean { return FREE_DOMAINS.has(domain); }

export const isDesk = (u: User) => u.role === "desk";
export const isCompliance = (u: User) => u.role === "compliance";
export const isClient = (u: User) => u.role === "client";

export function usersById(users: User[]): Record<string, User> {
  return Object.fromEntries(users.map((u) => [u.id, u]));
}

/** ¿La sala tiene al menos un miembro de la mesa (estructural: "dueño presente")? */
export function roomHasDesk(room: Room, byId: Record<string, User>): boolean {
  return room.members.some((id) => byId[id] && byId[id].role === "desk" && byId[id].active);
}

/** ¿Hay al menos un trader de la mesa ACTIVO (no idle/afk/offline)? Gatea el autotrade. */
export function anyDeskActive(users: User[], presence: Record<string, Presence>): boolean {
  return users.some((u) => u.role === "desk" && u.active && presence[u.id] === "active");
}

/** Resultado del ruteo de ejecución según presencia de la mesa. */
export function executionMode(users: User[], presence: Record<string, Presence>): "autotrade" | "rfq_only" {
  return anyDeskActive(users, presence) ? "autotrade" : "rfq_only";
}

/** ¿El usuario puede VER la sala? (desk: todas; compliance: las de su empresa, solo lectura;
 *  cliente: la de su empresa, con mesa presente y siendo miembro). */
export function canSeeRoom(user: User, room: Room, byId: Record<string, User>): boolean {
  if (!user.active) return false;
  if (isDesk(user)) return true;
  if (isCompliance(user)) return room.scopeCompanyId === user.companyId;
  return room.scopeCompanyId === user.companyId && roomHasDesk(room, byId) && room.members.includes(user.id);
}

/** ¿El usuario puede POSTEAR? (compliance NUNCA postea: es observador silencioso). */
export function canPost(user: User, room: Room, byId: Record<string, User>): boolean {
  if (isCompliance(user)) return false;
  if (!canSeeRoom(user, room, byId)) return false;
  return roomHasDesk(room, byId);
}

/** Validación al agregar un miembro a una sala (bloquea cruce de empresas y sala sin mesa). */
export function canJoin(user: User, room: Room, byId: Record<string, User>): { ok: boolean; reason?: string } {
  if (!user.active) return { ok: false, reason: "Usuario dado de baja." };
  if (isDesk(user)) return { ok: true };
  if (user.companyId !== room.scopeCompanyId) return { ok: false, reason: "Empresa distinta: no puede entrar a una sala de otra empresa." };
  if (!roomHasDesk(room, byId)) return { ok: false, reason: "La sala no tiene mesa presente." };
  return { ok: true };
}

/** Salas visibles para un usuario. */
export function visibleRooms(user: User, rooms: Room[], byId: Record<string, User>): Room[] {
  return rooms.filter((r) => canSeeRoom(user, r, byId));
}

/** Casillas que reciben la copia diaria de una sala: ambos compliance (empresa + mesa). */
export function complianceRecipients(room: Room, companies: Company[]): string[] {
  const out: string[] = [];
  const client = companies.find((c) => c.id === room.scopeCompanyId);
  const desk = companies.find((c) => c.kind === "desk");
  if (client?.complianceEmail) out.push(client.complianceEmail);
  if (desk?.complianceEmail) out.push(desk.complianceEmail);
  return [...new Set(out)];
}
