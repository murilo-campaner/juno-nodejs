const { JunoCardHash } = require('./lib/index');

const juno = new JunoCardHash('74942A9C8B05F538EE9A389459CBFD285C578F73A65B7476D1E818A8D9F14E91', 'sandbox');

juno.getCardHash({
    holderName: "José da Silva",
    cardNumber: "0000000000000000",
    securityCode: '000',
    expirationMonth: '12',
    expirationYear: '2025',
}).then(result => {
    console.log(result);
}).catch(err => {
    console.log(err.message);
})