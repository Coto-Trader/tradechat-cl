import { useEffect, useMemo, useRef, useState } from "react";
import { ChatStore, dailyDigest, newId } from "./engine/store";
import { Message, Presence, Room, User } from "./model/types";
import {
  canPost, complianceRecipients, domainOf, executionMode, isCompliance, isDesk,
  roomHasDesk, usersById, visibleRooms,
} from "./model/policy";
import { COMPANIES, SEED_ROOMS, USERS } from "./model/seed";

const PRES: Presence[] = ["active", "idle", "afk", "offline"];
const PRES_LABEL: Record<Presence, string> = { active: "Activo", idle: "Idle", afk: "AFK", offline: "Desconectado" };
const ROLE_LABEL: Record<string, string> = { desk: "mesa", client: "cliente", compliance: "compliance" };
const companyName = (id: string) => COMPANIES.find((c) => c.id === id)?.name ?? id;

export function App() {
  const storeRef = useRef<ChatStore>(new ChatStore());
  const [st, setSt] = useState(storeRef.current.state());
  const [meId, setMeId] = useState("a1");
  const [roomId, setRoomId] = useState("room-alfa");
  const [input, setInput] = useState("");
  const [accepted, setAccepted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("tradechat.accepted") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    const unsub = storeRef.current.subscribe(setSt);
    const s = storeRef.current.state();
    if (Object.keys(s.presence).length === 0) { storeRef.current.setPresence("t1", "active"); storeRef.current.setPresence("t2", "active"); }
    return () => unsub();
  }, []);

  // usuarios con baja aplicada
  const users: User[] = useMemo(
    () => USERS.map((u) => ({ ...u, active: u.active && !st.deactivated.includes(u.id) })),
    [st.deactivated]
  );
  const byId = useMemo(() => usersById(users), [users]);
  const presence = useMemo(() => {
    const p: Record<string, Presence> = {};
    for (const u of users) p[u.id] = st.presence[u.id] ?? (u.role === "desk" ? "active" : "offline");
    return p;
  }, [users, st.presence]);

  const me = byId[meId] ?? users[0];
  const rooms: Room[] = useMemo(() => [...SEED_ROOMS, ...st.dmRooms], [st.dmRooms]);
  const visible = useMemo(() => visibleRooms(me, rooms, byId), [me, rooms, byId]);
  const room = visible.find((r) => r.id === roomId) ?? visible[0];
  const roomMsgs = useMemo(() => room ? st.messages.filter((m) => m.roomId === room.id) : [], [st.messages, room]);
  const execMode = executionMode(users, presence);
  const canWrite = room ? canPost(me, room, byId) : false;

  const needsAccept = me && !accepted[me.id];

  function accept() {
    const next = { ...accepted, [me.id]: true };
    setAccepted(next);
    try { localStorage.setItem("tradechat.accepted", JSON.stringify(next)); } catch { /* ignore */ }
  }
  function send() {
    const text = input.trim();
    if (!text || !room || !canWrite) return;
    const m: Message = { id: newId("m"), ts: Date.now(), roomId: room.id, senderId: me.id, senderName: me.name, text };
    storeRef.current.post(m);
    setInput("");
  }
  function openDmWithDesk() {
    if (!isClient()) return;
    const id = `dm-${me.id}`;
    const desk = COMPANIES.find((c) => c.kind === "desk")!;
    const complianceClient = users.find((u) => u.role === "compliance" && u.companyId === me.companyId);
    const members = ["t1", "t2", "cmesa", me.id, ...(complianceClient ? [complianceClient.id] : [])];
    storeRef.current.addDm({ id, kind: "dm", scopeCompanyId: me.companyId, title: `DM privado · ${me.name} ↔ Mesa`, members });
    setRoomId(id);
    void desk;
  }
  function isClient() { return me.role === "client"; }
  function exportDaily() {
    if (!room) return;
    const txt = dailyDigest(room.title, roomMsgs, complianceRecipients(room, COMPANIES));
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tradechat_${room.id}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  }

  const memberLine = room
    ? room.members.map((id) => byId[id]).filter(Boolean).filter((u) => u.active || u.role === "compliance")
    : [];

  return (
    <>
      <div className="ribbon">
        <a href="https://tradeai.cl" target="_blank" rel="noreferrer">Suite TradeAI ↗</a>
        <span className="sep">|</span>
        <a href="https://tradefx.cl" target="_blank" rel="noreferrer">TradeFX ↗</a>
        <span className="sep">|</span>
        <span className="here">TradeChat</span>
        <span className="spacer" />
        <span>chat supervisado</span>
      </div>

      <div className="header">
        <h1>Trade<span className="accent">Chat</span> · Chat vivo supervisado</h1>
        <div className="sub">
          Multi-empresa por dominio corporativo · mesa siempre presente · Control Interno / Compliance observa &nbsp;·&nbsp;
          abrí otra ventana y logueá como otra empresa para ver el aislamiento
        </div>
      </div>

      <div className="main">
        {/* identidad + presencia + modo de ejecución */}
        <div className="idbar">
          <span className="lbl">Conectado como</span>
          <select value={meId} onChange={(e) => { setMeId(e.target.value); }}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role]} · {companyName(u.companyId)}</option>)}
          </select>
          <span className="who email">{me.email}</span>
          <span className="who">· dominio <span className="dom">@{domainOf(me.email)}</span></span>
          <span className={`badge ${me.role}`}>{ROLE_LABEL[me.role]}</span>
          <span className="spacer" />
          {isDesk(me) && (
            <span className="pres">
              <span className="lbl">presencia</span>
              <select value={presence[me.id]} onChange={(e) => storeRef.current.setPresence(me.id, e.target.value as Presence)}>
                {PRES.map((p) => <option key={p} value={p}>{PRES_LABEL[p]}</option>)}
              </select>
            </span>
          )}
          <span className={`exec ${execMode === "autotrade" ? "ok" : "block"}`}>
            {execMode === "autotrade" ? "autotrade habilitado" : "mesa ausente → solo cotización"}
          </span>
        </div>

        <div className="cols">
          {/* salas visibles (según policy) */}
          <div className="panel rooms">
            <div className="panel-head"><h2>Salas</h2><span className="spacer" /><span className="hint">{visible.length}</span></div>
            {visible.length === 0 ? <div className="empty">Sin salas visibles.</div> :
              visible.map((r) => {
                const unread = st.messages.filter((m) => m.roomId === r.id).length;
                return (
                  <div key={r.id} className={`room ${room?.id === r.id ? "on" : ""}`} onClick={() => setRoomId(r.id)}>
                    <span className="t">{r.title}</span>
                    <span className="m">{r.kind === "dm" ? "privado" : "empresa"} · {unread} msg · {companyName(r.scopeCompanyId)}</span>
                  </div>
                );
              })}
            {isClient() && !visible.find((r) => r.id === `dm-${me.id}`) && (
              <div className="panel-body"><button className="btn" onClick={openDmWithDesk}>+ DM privado con la mesa</button></div>
            )}
          </div>

          {/* conversación */}
          <div className="panel conv">
            {!room ? <div className="empty" style={{ padding: 24 }}>No hay sala seleccionada.</div> : (
              <>
                <div className="conv-head">
                  <span className="t">{room.title}</span>
                  <span className={`badge ${roomHasDesk(room, byId) ? "desk" : "compliance"}`}>{roomHasDesk(room, byId) ? "mesa presente" : "sin mesa"}</span>
                  <span className="spacer" />
                  {(isDesk(me) || isCompliance(me)) && <button className="btn ghost" onClick={exportDaily}>Exportar copia diaria</button>}
                </div>
                <div className="members">
                  <b>Miembros:</b> {memberLine.map((u) => `${u.name}${u.role === "compliance" ? " (observador)" : ""}`).join(" · ")}
                  <br /><b>Copia diaria →</b> miembros + {complianceRecipients(room, COMPANIES).join(", ")}
                </div>
                <div className="msgs">
                  {roomMsgs.length === 0 ? <div className="empty" style={{ margin: "auto" }}>Sin mensajes.</div> :
                    roomMsgs.map((m) => (
                      <div key={m.id} className={`bubble ${m.system ? "sys" : m.senderId === me.id ? "me" : "them"}`}>
                        {!m.system && <div className="who">{m.senderName}</div>}
                        <span>{m.text}</span>
                      </div>
                    ))}
                </div>
                <div className="chat-input">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    disabled={!canWrite}
                    placeholder={canWrite ? "Escribir mensaje…" : isCompliance(me) ? "Observador — solo lectura" : !roomHasDesk(room, byId) ? "No hay mesa presente" : "Sin permiso para postear"} />
                  <button className="btn primary" onClick={send} disabled={!canWrite}>Enviar</button>
                </div>
                <div className="advisor">🔒 Comunicación privada, supervisada por Control Interno / Compliance. Se archiva (log inmutable) y se envía copia diaria.</div>
              </>
            )}
          </div>
        </div>

        {/* admin (solo mesa): baja de usuarios + dominios/compliance */}
        {isDesk(me) && (
          <div className="panel admin" style={{ marginTop: 14 }}>
            <div className="panel-head"><h2>Admin · usuarios y empresas</h2><span className="hint">dar de baja = expulsa de las salas</span></div>
            <div className="panel-body" style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Empresa</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {USERS.map((u) => {
                    const off = st.deactivated.includes(u.id);
                    return (
                      <tr key={u.id} className={off ? "off" : ""}>
                        <td>{u.name}</td><td className="email">{u.email}</td>
                        <td><span className={`badge ${u.role}`}>{ROLE_LABEL[u.role]}</span></td>
                        <td>{companyName(u.companyId)}</td>
                        <td>{off ? "baja" : "activo"}</td>
                        <td><button className={`btn ghost ${off ? "" : "danger"}`} onClick={() => storeRef.current.setDeactivated(u.id, !off)}>{off ? "Reactivar" : "Dar de baja"}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="notice" style={{ marginTop: 10 }}>
                <b>Tenancy por dominio:</b> {COMPANIES.map((c) => `${c.name} (@${c.domains.join(", @")} → ${c.complianceEmail})`).join(" · ")}
              </div>
            </div>
          </div>
        )}

        <div className="notice">
          <b>Demo (este):</b> salas por empresa (dominio = llave), mesa siempre presente, observador de compliance, presencia que gatea autotrade, baja = expulsión, aviso + aceptación, y copia diaria exportable (log inmutable). &nbsp;
          <b>Producción:</b> Supabase (Auth + Postgres + Realtime) con RLS por dominio y Edge Function que manda la copia diaria.
        </div>
      </div>

      {/* aceptación por única vez */}
      {needsAccept && (
        <div className="overlay">
          <div className="modal">
            <div className="mh">Aviso de supervisión</div>
            <div className="mb">
              Estás por entrar a <b>TradeChat</b> como <b>{me.name}</b> (@{domainOf(me.email)}).<br /><br />
              Estas comunicaciones son <b>privadas</b> pero están <b>supervisadas por Control Interno / Compliance</b>: se archivan de forma inmutable y se envía una copia diaria a los miembros y a las casillas de compliance de ambas partes.
            </div>
            <div className="mf"><button className="btn primary" onClick={accept}>Entiendo y acepto</button></div>
          </div>
        </div>
      )}
    </>
  );
}
