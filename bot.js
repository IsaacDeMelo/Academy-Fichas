const express = require("express");
const fetch = require("node-fetch"); // Se estiver usando Node 18+, não precisa instalar, já é nativo

const app = express();
const port = process.env.PORT || 3000;

// O alvo para onde as fichas serão enviadas
const TARGET_BASE_URL = "http://node103.ldc.srv.br:30404";

// Middleware para capturar o body sem interferir no routing
app.use(express.raw({ type: "*/*", limit: "5mb" }));

// Rota de saúde
app.get("/healthz", (req, res) => res.send("OK"));

async function forwardRequest(req, res, targetPath) {
    const targetUrl = `${TARGET_BASE_URL}${targetPath}`;
    console.log(`Forwarding ${req.method} to: ${targetUrl}`);

    try {
        const headers = { ...req.headers };

        // Remova cabeçalhos que podem causar problemas de segurança ou loop
        delete headers.host;
        delete headers.connection;

        const fetchOptions = {
            method: req.method,
            headers,
            redirect: "follow"
        };

        if (req.body && req.body.length > 0) {
            fetchOptions.body = req.body;
        }

        const upstreamResponse = await fetch(targetUrl, fetchOptions);
        const responseData = await upstreamResponse.text();

        const contentType = upstreamResponse.headers.get("content-type");
        if (contentType) {
            res.setHeader("content-type", contentType);
        }

        res.status(upstreamResponse.status).send(responseData);
    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(502).send("Erro ao conectar ao servidor de destino.");
    }
}

app.post("/enviar-ficha-teste", (req, res) => {
    forwardRequest(req, res, "/enviar-ficha-teste");
});

app.post("/enviar-ficha-london", (req, res) => {
    forwardRequest(req, res, "/enviar-ficha-london");
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Proxy rodando em http://0.0.0.0:${port}`);
});
