const express = require("express");
const fetch = require("node-fetch"); // Se estiver no Node < 18, instale node-fetch. No 18+ já existe fetch nativo.

const app = express();
const port = Number(process.env.PORT) || 3000;

// O endereço base do seu servidor de destino (sem a rota no final)
const TARGET_BASE_URL = "http://node103.ldc.srv.br:30404";

// Captura o corpo bruto (Buffer) para repassar qualquer tipo de dado (JSON, Form, etc)
app.use(express.raw({ type: "*/*", limit: "2mb" }));

app.get("/healthz", (_req, res) => {
    res.status(200).send("ok");
});

// O '*' captura qualquer rota que venha depois da barra inicial
app.all("*", async (req, res) => {
    // req.url contém o caminho completo, ex: "/enviar-ficha-teste"
    const targetUrl = `${TARGET_BASE_URL}${req.url}`;
    
    console.log(`Encaminhando [${req.method}] para: ${targetUrl}`);

    try {
        const headers = { ...req.headers };
        // É importante deletar o host original para o destino não rejeitar a requisição
        delete headers.host;

        const hasBody = Buffer.isBuffer(req.body) && req.body.length > 0;

        const upstreamResponse = await fetch(targetUrl, {
            method: req.method, // Repassa POST, GET, PUT, etc.
            headers: headers,
            body: hasBody ? req.body : undefined,
            redirect: 'follow'
        });

        const responseText = await upstreamResponse.text();
        const responseContentType = upstreamResponse.headers.get("content-type");

        if (responseContentType) {
            res.setHeader("content-type", responseContentType);
        }

        res.status(upstreamResponse.status).send(responseText);
    } catch (error) {
        console.error("Erro ao encaminhar requisição:", error.message);
        res.status(502).json({
            error: "Falha ao encaminhar para o servidor de destino",
            details: error.message
        });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Proxy dinâmico rodando na porta ${port}`);
    console.log(`Alvo base: ${TARGET_BASE_URL}`);
});
