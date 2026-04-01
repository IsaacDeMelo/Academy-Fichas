# Academy-Fichas

Projeto configurado para subir como **Web Service** no Render.

## Como funciona

- O serviço inicia por `npm start`.
- O servidor HTTP roda em `0.0.0.0` e usa `process.env.PORT` (padrão do Render).
- Endpoint de saúde: `GET /healthz`.

## Deploy no Render

1. Faça push deste repositório para o GitHub.
2. No Render, clique em **New +** -> **Blueprint** (recomendado) e selecione o repositório.
3. O Render vai ler o arquivo `render.yaml` e criar o web service automaticamente.
4. Aguarde o primeiro deploy finalizar.

Opcionalmente, você pode criar manualmente um **Web Service** no painel:

- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/healthz`

## Teste local

```bash
npm install
npm start
```

Depois, abra:

- `http://localhost:3000/`
- `http://localhost:3000/healthz`