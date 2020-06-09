const { JunoCardHash } = require("./lib/index");

const juno = new JunoCardHash(
  "D87FD78FCC04C4DA425B2E2E4C88346ABDF32E5ECA7AB7EA350E2F72672B608B",
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
