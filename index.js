const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const express = require("express");
const cors = require("cors");
const socket = require("socket.io");
const qrcode = require("qrcode");
const http = require("http");
const https = require("https");
const {
    dataToImg,
    sendImageFromPath,
    numberFormatter,
    setClient,
    sleep,
} = require("./helper");
const DonationController = require("./pay");
const port = process.env.PORT || 3020;

const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [
            `--no-sandbox`,
            `--disable-setuid-sandbox`,
            `--disable-dev-shm-usage`,
            `--disable-accelerated-2d-canvas`,
            `--no-first-run`,
            `--no-zygote`,
            `--single-process`, // <- this one doesn't works in Windows
            `--disable-gpu`,
        ],
        // executablePath: `/usr/bin/google-chrome-stable`,
        executablePath: `C:/Program Files/Google/Chrome/Application/chrome.exe`,
    },
    authStrategy: new LocalAuth(),
});

const app = express();
const server = http.createServer(app);
const io = socket(server);
const owner = `6282286230830@c.us`;
let isReady = false;

app.use(cors());
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);

app.get(`/`, (req, res) => {
    res.sendFile(`index.html`, {
        root: __dirname,
    });
});

client.on(`message`, async (message) => {
    try {
        if (typeof message.body != "string") return;
        if (sleep() == -1) return;
        if (
            message.body &&
            (message.body.includes(`\``) || message.body.includes(`*`))
        ) {
            message.body = message.body.replace(/\`/g, ``).replace(/\*/g, ``);
        }
        let chat = await message.getChat();
        await chat.sendSeen();
        if (
            (chat.isGroup && message.body.toLowerCase().startsWith(`-`)) ||
            !chat.isGroup
        ) {
            sleep(0, chat.id._serialized);
            message.reply(
                `Maaf, bot sedang tidur 😴 Tunggu sampai botnya bangun yaa 😁\nJangan lupa premium agar botnya makin semangat menemani hari-harimu 🤩`
            );
        }
    } catch (err) {
        message.reply("Maaf, ada error!\n\n" + err);
    }
});

client.on(`message_create`, async (message) => {
    if (!message.fromMe && (message.author || message.from) != owner) return;
    if (message.to != owner) return;
    if (typeof message.body != "string") return;
    if (message.body.toLowerCase().startsWith(`-setsleep`)) {
        sleep(1);
        await message.reply(`Bot di set ke mode SLEEP!`);
    } else if (message.body.toLowerCase().startsWith(`-wake`)) {
        sleep(-1, null, client);
        await message.reply(`Bot di set ke mode NORMAL!`);
    }
});

const rejectCalls = true;
client.on(`call`, async (call) => {
    if (rejectCalls) await call.reject();
    await client.sendMessage(
        call.from,
        `[${call.fromMe ? `Keluar` : `Masuk`}] Telepon darimu, tipe panggilan ${
            call.isVideo ? `video` : `suara`
        }${call.isGroup ? ` grup` : ``}. ${
            rejectCalls ? `Otomatis ditolak sesuai program.` : ``
        }`
    );
});

client.initialize();

// Socket IO
io.on(`connection`, function (socket) {
    socket.emit(`message`, `Connecting...`);

    client.on(`loading_screen`, (percent, message) => {
        socket.emit(`message`, `${percent}% ${message}`);
    });

    client.on(`qr`, (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit(`qr`, url);
            socket.emit(`message`, `QR Code received, scan please!`);
        });
    });

    client.on(`ready`, () => {
        socket.emit(`ready`, `Whatsapp is ready!`);
        socket.emit(`message`, `Whatsapp is ready!`);
    });

    client.on(`authenticated`, () => {
        socket.emit(`authenticated`, `Whatsapp is authenticated!`);
        socket.emit(`message`, `Whatsapp is authenticated!`);
    });

    client.on(`auth_failure`, function (session) {
        socket.emit(`message`, `Auth failure, restarting...`);
    });

    client.on(`disconnected`, (reason) => {
        socket.emit(`message`, `Whatsapp is disconnected!`);
    });
});

client.on(`loading_screen`, (percent, message) => {
    console.log(`LOADING SCREEN`, percent, message);
});

client.on(`qr`, (qr) => {
    console.log(`QR RECEIVED`, qr);
});

client.on(`ready`, () => {
    setClient(client, owner);
    isReady = true;
    console.log(`READY`);
});

client.on(`authenticated`, () => {
    console.log(`AUTHENTICATED`);
});

client.on(`auth_failure`, function (session) {
    console.log(`Auth failure, restarting...`);
});

client.on(`disconnected`, (reason) => {
    console.log(`Whatsapp is disconnected!`, reason);
    client.destroy();
    client.initialize();
});

app.post("/donate", DonationController.handleDonation);
app.post("/send", async (req, res) => {
    const { to, msg, img, ext } = req.body;
    if (!isReady || !to) return res.send("not ready for send api");
    if (img) {
        const fileName = await dataToImg(img, ext || "png");
        if (fileName)
            await sendImageFromPath(
                client,
                numberFormatter(to),
                msg,
                fileName,
                MessageMedia
            );
        else client.sendMessage(numberFormatter(to), "Gagal mengirim gambar!");
    } else {
        await client.sendMessage(numberFormatter(to), msg);
    }
    res.send("success");
});

server.listen(port, function () {
    console.log(`App running on http://localhost:` + port);
});
