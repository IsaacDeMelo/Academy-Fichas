const express = require("express");
const fetch = require("node-fetch"); // Se estiver usando Node 18+, não precisa instalar, já é nativo

const app = express();
const port = process.env.PORT || 3000;

// O alvo para onde as fichas serão enviadas
const TARGET_BASE_URL = "http://node103.ldc.srv.br:30404";

// Middleware para capturar o corpo da requisição como Buffer (essencial para Proxy)
app.use(express.raw({ type: "*/*", limit: "5mb" }));

// Rota de saúde
app.get("/healthz", (req, res) => res.send("OK"));

// O segredo está aqui: o '*' captura TUDO
app.all("*", async (req, res) => {
    // Evita loop infinito se o TARGET_BASE_URL for o próprio servidor
    if (req.url === '/healthz') return;

    const targetUrl = `${TARGET_BASE_URL}${req.url}`;
    
    console.log(`Forwarding ${req.method} to: ${targetUrl}`);

    try {
        const headers = { ...req.headers };
        
        // Remova cabeçalhos que podem causar problemas de segurança ou loop
        delete headers.host;
        delete headers.connection;

        const fetchOptions = {
            method: req.method,
            headers: headers,
            redirect: 'follow'
        };

        // Se houver corpo na requisição (POST/PUT), repassa
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            fetchOptions.body = req.body;
        }

        const upstreamResponse = await fetch(targetUrl, fetchOptions);
        const responseData = await upstreamResponse.text();

        // Repassa os cabeçalhos de resposta (como content-type)
        const contentType = upstreamResponse.headers.get("content-type");
        if (contentType) {
            res.setHeader("content-type", contentType);
        }

        res.status(upstreamResponse.status).send(responseData);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(502).send("Erro ao conectar ao servidor de destino.");
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Proxy rodando em http://0.0.0.0:${port}`);
});
