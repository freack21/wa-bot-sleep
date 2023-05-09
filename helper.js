const fs = require("fs");
let clients = null;
let owners = null;

exports.dataToImg = async (data, extension) => {
    const mediaPath = "./downloaded-media/";
    if (!fs.existsSync(mediaPath)) {
        fs.mkdirSync(mediaPath);
    }
    const filename = new Date().getTime();
    let fullFilename = mediaPath + filename + "." + extension;
    try {
        fs.writeFileSync(fullFilename, data, {
            encoding: "base64",
        });
        return fullFilename;
    } catch (err) {
        console.log("failed to save:", err);
        return false;
    }
};

exports.sendImageFromPath = async (
    client,
    to,
    caption,
    filePath,
    MessageMedia
) => {
    try {
        await client.sendMessage(to, MessageMedia.fromFilePath(filePath), {
            caption,
        });
        fs.unlinkSync(filePath);
    } catch (err) {
        message.reply(`Gagal mengirim gambar.`);
    }
};

exports.sleep = (status, user, client) => {
    const file = fs.readFileSync("./sleep.json");
    let data = JSON.parse(file);
    if (status == -1) {
        data.forEach((d, i) => {
            if (i != 0)
                client.sendMessage(
                    d,
                    "Halo! Bot sudah bangun. Terimakasih telah menggunakan bot ini.\n\nJangan lupa premium yaa!"
                );
        });
        data = [{ status }];
        fs.writeFileSync("./sleep.json", JSON.stringify(data));
    } else if (status == 1) {
        data.splice(0, 1, { status });
        fs.writeFileSync("./sleep.json", JSON.stringify(data));
    } else if (status == 0) {
        let index = 0;
        data.filter((d, i) => {
            if (d == user) index = i;
        });
        if (index != 0) return;
        else {
            data.push(user);
            fs.writeFileSync("./sleep.json", JSON.stringify(data));
        }
    } else {
        return data[0].status;
    }
};

exports.setClient = (client, owner) => {
    clients = client;
    owners = owner;
};

exports.payNotify = async (name, amount, nowa) => {
    await clients.sendMessage(
        owners,
        `Halo, ${name} mengirim Rp.${amount} ke kamu.\n\n*Pesan :*\n${nowa}`,
        { mentions: [await clients.getContactById(owners)] }
    );
    let limit = amount / 20,
        reset = 30;
    switch (amount) {
        case 2000:
            limit = 300;
            reset = 7;
            break;
        case 5000:
            limit = 650;
            break;
        case 10000:
            limit = 1000;
            break;
        case 15000:
            limit = 1000;
            reset = 45;
            break;
    }
    await clients.sendMessage(owners, `-cpr|${nowa}|${limit}|${name}|${reset}`);
};

exports.numberFormatter = function (number) {
    let formatted = number.replace(/\D/g, "");

    if (formatted.startsWith("@")) {
        formatted = formatted.slice(1);
    }

    if (formatted.startsWith("0")) {
        formatted = "62" + formatted.substr(1);
    }

    if (!formatted.endsWith("@c.us")) {
        formatted += "@c.us";
    }

    return formatted;
};
