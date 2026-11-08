# TradeChat — Diseño

Chat vivo **supervisado** para la Suite TradeAI: standalone en **tradechat.cl** y
embebible como "ventana viva" en cada módulo (TradeFX, TradeSwap, …).

## Invariante única (gobierna todo)
> En toda sala: (a) **todos los clientes son de la misma empresa** (llave =
> **dominio del correo corporativo**), y (b) hay al menos una **mesa (dueño)**
> presente.

De esa sola regla salen: 1:1 (`dm`), N:N (`group` de una empresa), prohibición de
mezclar empresas, y "no hay chat entre clientes sin dueño presente".

## Entidades (`src/model/types.ts`)
- `Company { kind: desk|client, domains[], complianceEmail }` — la `desk` es el
  operador/dueño; los dominios son el allowlist que identifica a la empresa.
- `User { email, companyId, role: desk|client|compliance, active }` — el dominio
  del email define la empresa; `compliance` = observador silencioso.
- `Room { kind: company|dm, scopeCompanyId, members[] }`.
- `Message` — append-only (log inmutable).

## Reglas (`src/model/policy.ts`, puras)
- **Tenancy por dominio**: `companyByDomain`; dominios libres (gmail/outlook) no
  sirven de llave (allowlist corporativo). La mesa transciende todas las salas.
- `canSeeRoom` / `canPost` / `canJoin`: cliente solo su empresa + mesa presente;
  compliance ve su empresa en **solo lectura**; cruce de empresas rechazado.
- **Presencia** `active|idle|afk|offline`: `anyDeskActive` → `executionMode`
  `autotrade` vs `rfq_only`. Si todos los traders están ausentes, el autotrade
  (en TradeFX) cae a **cotización**. Mismo concepto = "dueño presente".
- **Baja** (`active=false`) → expulsado de salas, sin acceso.

## Compliance (regulado)
- Cada empresa declara su **casilla de Control Interno / Compliance** en el alta
  (ambos lados: cliente + operador). `complianceRecipients(room)` resuelve las dos.
- **Log inmutable** append-only; **copia diaria** (cierre de día) a miembros + ambas
  casillas → `dailyDigest()` (en el demo se exporta/descarga; en prod Edge Function).
- **Aviso de supervisión** permanente bajo cada chat + **aceptación por única vez**.

## Arquitectura
- **Demo (este):** `ChatStore` (BroadcastChannel + localStorage) + `ChatPolicy`
  pura. `login-as` para ver todas las perspectivas; abrir dos ventanas sincroniza.
- **Producción:** **Supabase** (Auth + Postgres + Realtime) con **RLS por dominio**
  — el candado real (el navegador no es confiable). La copia diaria = Edge
  Function + cron. Email verificado en el alta.

## Verificado (demo)
Aislamiento por empresa (Alfa no ve Beta), compliance solo-lectura, cruce
rechazado, presencia → autotrade/rfq, baja = expulsión, aviso + aceptación,
copia diaria exportable.

## Siguiente
Supabase (auth + RLS + realtime + Edge Function de copia diaria); embeber la
"ventana viva" en TradeFX/TradeSwap; gatear el autotrade de TradeFX con la
presencia compartida; alta de empresas (dominios + casilla compliance verificada).
