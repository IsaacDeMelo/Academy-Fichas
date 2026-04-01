const path = require("path");
const express = require("express");
const QRCode = require("qrcode");
const { Boom } = require("@hapi/boom");
const {
	default: makeWASocket,
	DisconnectReason,
	fetchLatestBaileysVersion,
	useMultiFileAuthState
} = require("@whiskeysockets/baileys");

const app = express();
const port = Number(process.env.PORT) || 3000;
const authFolder = process.env.BAILEYS_AUTH_DIR || path.join(__dirname, ".baileys_auth");

let sock;
let latestQrText = null;
let connected = false;
let lastState = "starting";
let connectedAt = null;
let currentUser = null;

async function startWhatsApp() {
	const { state, saveCreds } = await useMultiFileAuthState(authFolder);
	const { version } = await fetchLatestBaileysVersion();

	sock = makeWASocket({
		auth: state,
		version,
		printQRInTerminal: true
	});

	sock.ev.on("creds.update", saveCreds);

	sock.ev.on("connection.update", async (update) => {
		const { connection, lastDisconnect, qr } = update;

		if (qr) {
			latestQrText = qr;
			lastState = "qr_ready";
			console.log("QR atualizado. Abra /qr para escanear.");
		}

		if (connection === "open") {
			connected = true;
			lastState = "open";
			connectedAt = new Date().toISOString();
			latestQrText = null;
			currentUser = sock.user || null;
			console.log("WhatsApp conectado com sucesso.");
		}

		if (connection === "close") {
			connected = false;
			lastState = "closed";

			const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
			const loggedOut = statusCode === DisconnectReason.loggedOut;

			console.log(
				`Conexao encerrada (status=${statusCode || "unknown"}). Reconnect=${!loggedOut}`
			);

			if (!loggedOut) {
				setTimeout(() => {
					startWhatsApp().catch((error) => {
						console.error("Erro ao reconectar no WhatsApp:", error);
					});
				}, 3000);
			}
		}
	});
}

app.get("/", (_req, res) => {
	res.status(200).json({
		service: "academy-fichas",
		status: "ok",
		whatsapp: {
			connected,
			state: lastState,
			qrAvailable: Boolean(latestQrText)
		}
	});
});

app.get("/healthz", (_req, res) => {
	res.status(200).send("ok");
});

app.get("/session", (_req, res) => {
	res.status(200).json({
		connected,
		state: lastState,
		qrAvailable: Boolean(latestQrText),
		connectedAt,
		user: currentUser
	});
});

app.get("/qr", async (_req, res) => {
	if (connected) {
		res.status(200).send(
			"<h1>WhatsApp ja conectado</h1><p>Se quiser novo QR, desconecte a sessao atual.</p>"
		);
		return;
	}

	if (!latestQrText) {
		res.status(503).send(
			"<h1>QR ainda nao disponivel</h1><p>Recarregue em alguns segundos.</p>"
		);
		return;
	}

	try {
		const qrDataUrl = await QRCode.toDataURL(latestQrText, {
			margin: 1,
			width: 320
		});

		res.status(200).send(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>QR WhatsApp</title>
      </head>
      <body style="font-family: sans-serif; text-align: center; padding: 24px;">
        <h1>Escaneie o QR no WhatsApp</h1>
        <p>WhatsApp > Dispositivos conectados > Conectar dispositivo</p>
        <img src="${qrDataUrl}" alt="QR Code WhatsApp" />
        <p style="margin-top:16px;">Atualize a pagina se o QR expirar.</p>
      </body>
      </html>
    `);
	} catch (error) {
		console.error("Erro ao gerar imagem do QR:", error);
		res.status(500).json({ error: "Falha ao gerar QR" });
	}
});

app.listen(port, "0.0.0.0", () => {
	console.log(`academy-fichas listening on ${port}`);
});

startWhatsApp().catch((error) => {
	lastState = "error";
	console.error("Erro ao iniciar cliente WhatsApp:", error);
});
