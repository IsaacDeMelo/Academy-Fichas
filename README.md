# Academy-Fichas

Servico Node.js para Render que encaminha as requisicoes para um destino configuravel por ambiente.

## Comportamento

- `GET /healthz`: retorna `ok` (healthcheck do Render).
- `GET /debug-upstream?path=/qualquer-caminho`: testa conectividade com o destino configurado.
- Qualquer outra rota/metodo: reenvia para o destino configurado como `POST`, preservando o caminho e a query string.
- O corpo da requisicao, os headers e o `Content-Type` sao repassados para o destino.

## Configuracao

Defina a variavel de ambiente `TARGET_BASE_URL` com o endereco real de destino, por exemplo:

`http://node103.ldc.srv.br:30404`

Se o destino tiver uma base path, ela tambem pode ser incluida, por exemplo:

`http://node103.ldc.srv.br:30404/api`

## Deploy no Render

1. Faça push deste repositório para o GitHub.
2. No Render, clique em New + e depois Blueprint (recomendado), selecionando o repositório.
3. O Render vai ler o arquivo `render.yaml` e criar o web service.
4. Aguarde o primeiro deploy finalizar.
5. Configure `TARGET_BASE_URL` nas variaveis de ambiente do servico, se quiser sobrescrever o destino padrao.

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