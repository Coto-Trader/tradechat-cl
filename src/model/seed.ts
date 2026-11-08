import { Company, Room, User } from "./types";

export const COMPANIES: Company[] = [
  { id: "desk", name: "Coto-TradeAI · Mesa", kind: "desk", domains: ["coto-tradeai.cl"], complianceEmail: "compliance@coto-tradeai.cl" },
  { id: "alfa", name: "Alfa Capital", kind: "client", domains: ["alfa-capital.cl"], complianceEmail: "control-interno@alfa-capital.cl" },
  { id: "beta", name: "Beta Finanzas", kind: "client", domains: ["beta-finanzas.cl"], complianceEmail: "compliance@beta-finanzas.cl" },
];

export const USERS: User[] = [
  // mesa (operador / dueño del sistema)
  { id: "t1", name: "Trader Uno", email: "trader1@coto-tradeai.cl", companyId: "desk", role: "desk", active: true },
  { id: "t2", name: "Trader Dos", email: "trader2@coto-tradeai.cl", companyId: "desk", role: "desk", active: true },
  { id: "cmesa", name: "Compliance Mesa", email: "compliance@coto-tradeai.cl", companyId: "desk", role: "compliance", active: true },
  // Alfa Capital
  { id: "a1", name: "Ana · Alfa", email: "ana@alfa-capital.cl", companyId: "alfa", role: "client", active: true },
  { id: "a2", name: "Alberto · Alfa", email: "alberto@alfa-capital.cl", companyId: "alfa", role: "client", active: true },
  { id: "calfa", name: "Control Interno · Alfa", email: "control-interno@alfa-capital.cl", companyId: "alfa", role: "compliance", active: true },
  // Beta Finanzas
  { id: "b1", name: "Bruno · Beta", email: "bruno@beta-finanzas.cl", companyId: "beta", role: "client", active: true },
  { id: "cbeta", name: "Compliance · Beta", email: "compliance@beta-finanzas.cl", companyId: "beta", role: "compliance", active: true },
];

// Salas de empresa (auto-enroladas): cada cliente de la empresa + la mesa + ambos compliance.
export const SEED_ROOMS: Room[] = [
  { id: "room-alfa", kind: "company", scopeCompanyId: "alfa", title: "Alfa Capital ↔ Mesa", members: ["t1", "t2", "cmesa", "a1", "a2", "calfa"] },
  { id: "room-beta", kind: "company", scopeCompanyId: "beta", title: "Beta Finanzas ↔ Mesa", members: ["t1", "t2", "cmesa", "b1", "cbeta"] },
];
