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
const groupId = process.env.WHATSAPP_GROUP_ID || "120363359675685823@g.us";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
		version
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

	sock.ev.on("messages.upsert", async ({ messages, type }) => {
		if (type !== "notify") {
			return;
		}

		const msg = messages?.[0];
		if (!msg?.message) {
			return;
		}

		const sender = msg.key.remoteJid;
		const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

		if (!sender || !text) {
			return;
		}

		if (text === "!grupo") {
			if (sender.endsWith("@g.us")) {
				await sock.sendMessage(sender, {
					text: `📍 *ID DESTE GRUPO:*\n\n${sender}\n\nUse este valor em WHATSAPP_GROUP_ID.`
				});
			} else {
				await sock.sendMessage(sender, {
					text: "Esse comando so funciona em grupo."
				});
			}
		}

		if (text === "!ping") {
			await sock.sendMessage(sender, { text: "pong!" });
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

app.post("/enviar-ficha", async (req, res) => {
	if (!sock || !connected) {
		res.status(503).json({
			error: "WhatsApp ainda nao conectado",
			hint: "Abra /qr para escanear e tente novamente"
		});
		return;
	}

	const d = req.body || {};
	const mensagemFormatada =
		"📝 *NOVA FICHA DE CRIACAO* 📝\n\n" +
		"👤 *INFORMACOES DO JOGADOR*\n" +
		`• *Nome:* ${d.jogador || "Nao informado"}\n` +
		`• *Idade:* ${d.idade || "Nao informado"}\n` +
		`• *Telefone:* ${d.telefone || "Nao informado"}\n` +
		`• *Disponibilidade:* ${d.disponibilidade || "Nao informado"}\n` +
		`• *Academia:* ${d.academia || "Nao informado"}\n` +
		`• *Obs:* ${d.observacoes || "Sem observacoes"}\n\n` +
		"🎭 *INFORMACOES DO PERSONAGEM*\n" +
		`• *Nome:* ${d.personagem || "Nao informado"}\n` +
		`• *ID:* ${d.id || "Nao informado"}\n` +
		`• *Classe:* ${d.classe || "Nao informado"}\n` +
		`• *Cla:* ${d.cla || "Nao informado"}\n` +
		`• *Descricao:* ${d.descricao || "Sem descricao"}`;

	try {
		await sock.sendMessage(groupId, { text: mensagemFormatada });
		res.status(200).json({
			ok: true,
			message: "Ficha enviada com sucesso",
			groupId
		});
	} catch (error) {
		console.error("Erro ao enviar ficha para o grupo:", error);
		res.status(500).json({
			error: "Erro ao enviar para o WhatsApp",
			hint: "Verifique WHATSAPP_GROUP_ID e permissao do bot no grupo"
		});
	}
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
