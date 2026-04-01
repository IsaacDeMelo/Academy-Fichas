# Academy-Fichas

Projeto configurado para subir como Web Service no Render com login de WhatsApp via QR Code.

## Endpoints

- `GET /`: status geral do servico e estado do WhatsApp.
- `GET /healthz`: health check para o Render.
- `GET /session`: detalhes da sessao atual do WhatsApp.
- `GET /qr`: pagina HTML com o QR Code para escaneamento.

## Como escanear o QR no Render

1. Faça deploy no Render.
2. Abra a URL publica do seu servico com `/qr` no final.
3. Escaneie no celular: WhatsApp > Dispositivos conectados > Conectar dispositivo.
4. Confira em `/session` se `connected` ficou `true`.

## Observacao importante sobre sessao

Por padrao, o Render pode reiniciar o container e limpar arquivos locais. Isso pode fazer o bot pedir novo QR.

Para sessao estavel em producao, use uma estrategia de persistencia (disco persistente no Render quando disponivel ou armazenamento externo).

## Deploy no Render

1. Faça push deste repositório para o GitHub.
2. No Render, clique em New + e depois Blueprint (recomendado), selecionando o repositório.
3. O Render vai ler o arquivo `render.yaml` e criar o web service.
4. Aguarde o primeiro deploy finalizar.

Configuracao manual (alternativa):

- Environment: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/healthz`

## Rodar localmente

```bash
npm install
npm start
```

Abra no navegador:

- `http://localhost:3000/`
- `http://localhost:3000/qr`
- `http://localhost:3000/session`