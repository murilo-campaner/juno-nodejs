# JUNO Card Hash - NodeJS

Esse projeto destina-se a pessoas que estão realizando a integração com a API de pagamentos [JUNO](https://juno.com.br/) e estão encontrando problemas para realizar o hash do cartão de crédito no Frontend.

No nosso caso, tinhamos problema para realizar a criptografia dos dados do cartão, pela necessidade de utilizar uma chave pública em um ambiente ReactNative (Utilizando Expo).

A plataforma não disponibiliza até o momento nenhuma forma de integração mobile que não seja usando as bibliotecas nativas.

Dessa forma, fizemos o envio dos dados do cartão (requisição com SSL) para nosso backend Node e no backend criamos essa biblioteca que converte os dados do cartão em um Hash, para então enviar para a plataforma da JUNO.

## Instalação

Instale o pacote através do comando:

`npm install juno-nodejs --save`

## Utilização

```
    const { JunoCardHash } = require('juno-nodejs');
    
    const publicToken = ''; // Token público da api da JUNO
    const environment = 'sandbox'; // 'sandbox' || 'production'
    const cardData = {
        holderName: "José da Silva",
        cardNumber: "0000000000000000",
        securityCode: '000',
        expirationMonth: '12',
        expirationYear: '2025',
    };

    const junoService = new JunoCardHash(publicToken, environment);

    junoService.getCardHash(cardData)
        .then(({ data }) => console.log(data)); // Hash
```

