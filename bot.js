const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 3000;
const targetUrl = "http://node103.ldc.srv.br:30404/enviar-ficha";

// Captura o corpo bruto para repassar exatamente ao destino.
app.use(express.raw({ type: "*/*", limit: "2mb" }));

app.get("/healthz", (_req, res) => {
	res.status(200).send("ok");
});

app.all("/{*splat}", async (req, res) => {
	try {
		const headers = {};
		if (req.headers["content-type"]) {
			headers["content-type"] = req.headers["content-type"];
		}

		const hasBody = Buffer.isBuffer(req.body) && req.body.length > 0;
		const upstreamResponse = await fetch(targetUrl, {
			method: "POST",
			headers,
			body: hasBody ? req.body : undefined
		});

		const responseText = await upstreamResponse.text();
		const responseContentType = upstreamResponse.headers.get("content-type");

		if (responseContentType) {
			res.setHeader("content-type", responseContentType);
		}

		res.status(upstreamResponse.status).send(responseText);
	} catch (error) {
		console.error("Erro ao encaminhar requisicao:", error);
		res.status(502).json({
			error: "Falha ao encaminhar para o servidor de destino"
		});
	}
});

app.listen(port, "0.0.0.0", () => {
	console.log(`redirect service listening on ${port}`);
});
