const { JunoCardHash } = require("./lib/index");

const juno = new JunoCardHash(
  "PUBLIC_TOKEN",
  "sandbox"
);

juno
  .getCardHash({
    holderName: "José da Silva",
    cardNumber: "5253286010447710",
    securityCode: "172",
    expirationMonth: "09",
    expirationYear: "2021",
  })
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err.message);
  });
