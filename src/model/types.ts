// Modelo de TradeChat.

export type CompanyKind = "desk" | "client";

export interface Company {
  id: string;
  name: string;
  kind: CompanyKind;          // desk = operador/dueño del sistema
  domains: string[];          // dominios corporativos (allowlist) -> llave de empresa
  complianceEmail: string;    // casilla de Control Interno / Compliance (declarada por la empresa)
}

export type UserRole = "desk" | "client" | "compliance";
export type Presence = "active" | "idle" | "afk" | "offline";

export interface User {
  id: string;
  name: string;
  email: string;              // correo corporativo (1:1); su dominio define la empresa
  companyId: string;
  role: UserRole;             // compliance = observador silencioso
  active: boolean;            // baja -> false -> expulsado de salas
}

export type RoomKind = "company" | "dm";

export interface Room {
  id: string;
  kind: RoomKind;
  scopeCompanyId: string;     // una sola empresa cliente por sala
  title: string;
  members: string[];          // userIds: clientes (misma empresa) + mesa + observadores compliance
}

export interface Message {
  id: string;
  ts: number;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  system?: boolean;
}
