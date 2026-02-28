# Nowtomation Dynamimages - Backend Local

## Setup rápido

```bash
cd backend
npm install
node setup.js    # Cria usuário admin
npm start        # Inicia na porta 3000
```

## Credenciais padrão

| Campo | Valor |
|-------|-------|
| Email | `admin@nowtomation.com` |
| Senha | `admin123` |
| API Token | `ntm-api-token-2025-secure` |

## Expor com Cloudflare Tunnel

```bash
# Instale o cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:3000
```

Copie a URL gerada (ex: `https://xxx.trycloudflare.com`) e configure como `VITE_API_URL` no Cloudflare Pages.

## Variáveis de ambiente

Já configuradas no `.env`. Altere conforme necessário antes de rodar em produção.
