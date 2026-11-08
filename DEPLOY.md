# Deploy — TradeChat (tradechat.cl)

SPA estática (Vite React TS) → GitHub Pages con dominio **tradechat.cl**.
El DNS ya está en **Cloudflare** (NIC.cl → nameservers de Cloudflare).

## 1. Crear el repo y publicar (lo corrés vos — el guard me bloquea crear repos públicos)

Desde `C:\Users\carlo\Proyectos\tradechat-cl`:

```bash
gh repo create Coto-Trader/tradechat-cl --public --source=. --remote=origin --push
```

## 2. Habilitar Pages (una vez)

Repo **tradechat-cl → Settings → Pages → Source: "GitHub Actions"**.
(El `CNAME` en `public/` fija el dominio `tradechat.cl` al desplegar.)

## 3. DNS en Cloudflare (ya tenés el dominio ahí)

En el dashboard de Cloudflare, zona `tradechat.cl`, agregá los records de GitHub Pages:
- `A  @  185.199.108.153` · `185.199.109.153` · `185.199.110.153` · `185.199.111.153`
- `CNAME  www  coto-trader.github.io`
- Proxy **DNS only** (nube gris), SSL/TLS **Full**.

En GitHub → Settings → Pages, el custom domain queda `tradechat.cl` (lo toma del CNAME); activá **Enforce HTTPS** cuando emita el certificado.

## Resultado
**https://tradechat.cl** (y mientras tanto, `https://coto-trader.github.io/tradechat-cl/`).
