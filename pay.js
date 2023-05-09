const { payNotify } = require("./helper");

class DonationController {
    static handleDonation(request, response) {
        const { donator_name, amount_raw, message } = request.body;
        const name = donator_name;
        const amount = parseInt(amount_raw);
        const noWa = message;
        payNotify(name, amount, noWa);

        response.status(200);
    }
}

module.exports = DonationController;
