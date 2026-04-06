const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

// O alvo para onde as requisições serão enviadas
const TARGET_BASE_URL = process.env.TARGET_BASE_URL || "http://node103.ldc.srv.br:30404";

// Middleware para capturar o body sem interferir no routing
app.use(express.raw({ type: "*/*", limit: "5mb" }));

// Rota de saúde
app.get("/healthz", (req, res) => res.send("OK"));

// Rota de diagnóstico para verificar conectividade com o destino
app.get("/debug-upstream", async (req, res) => {
    const targetPath = req.query.path || "/enviar-ficha-teste";
    const targetUrl = buildTargetUrl(TARGET_BASE_URL, targetPath);

    try {
        const upstreamResponse = await fetch(targetUrl, {
            method: "GET",
            redirect: "follow"
        });
        const text = await upstreamResponse.text();
        res.status(200).json({
            ok: true,
            targetUrl,
            status: upstreamResponse.status,
            responsePreview: text.slice(0, 200)
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            targetUrl,
            name: error?.name,
            message: error?.message,
            cause: error?.cause ? String(error.cause) : null
        });
    }
});

function buildTargetUrl(baseUrl, requestPath) {
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedRequestPath = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;

    return `${normalizedBaseUrl}${normalizedRequestPath}`;
}

async function forwardRequest(req, res, targetPath) {
    const targetUrl = buildTargetUrl(TARGET_BASE_URL, targetPath);
    const bodyLength = req.body ? req.body.length : 0;
    console.log(`Forwarding as POST to: ${targetUrl} (body: ${bodyLength} bytes)`);

    try {
        const headers = { ...req.headers };

        // Remova cabeçalhos que podem causar problemas de segurança ou loop
        delete headers.host;
        delete headers.connection;

        const fetchOptions = {
            method: "POST",
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
        console.error("Proxy Error:", {
            message: error?.message,
            name: error?.name,
            cause: error?.cause,
            stack: error?.stack
        });
        res.status(502).send(`Erro ao conectar ao servidor de destino: ${error?.message || "desconhecido"}`);
    }
}

app.use((req, res, next) => {
    if (req.path === "/healthz" || req.path === "/debug-upstream") {
        return next();
    }

    forwardRequest(req, res, req.originalUrl);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Proxy rodando em http://0.0.0.0:${port}`);
});
