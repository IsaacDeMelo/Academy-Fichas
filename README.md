# Academy-Fichas

Servico Node.js para Render que encaminha as requisicoes para:

`http://node103.ldc.srv.br:30404/enviar-ficha`

## Comportamento

- `GET /healthz`: retorna `ok` (healthcheck do Render).
- Qualquer outra rota/metodo: reenvia para o destino acima sempre com metodo `POST`.
- O corpo da requisicao e o `Content-Type` sao repassados para o destino.

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