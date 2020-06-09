const crypto = require("isomorphic-webcrypto");

import { decode } from "base-64";
import * as qs from "qs";
import axios, { AxiosInstance } from "axios";

const ENVIRONMENT = {
  SANDBOX: "sandbox",
  PRODUCTION: "production",
};

type ENV = "sandbox" | "production";

interface iCardData {
  holderName: string;
  cardNumber: string;
  securityCode: string;
  expirationMonth: string;
  expirationYear: string;
}

class JunoCardHash {
  publicToken: string;
  environment: ENV;
  axios: AxiosInstance;
  constructor(publicToken: string, environment: ENV = "sandbox") {
    this.publicToken = publicToken;
    this.environment = environment;
    this.axios = this._configureAxios(this.environment);
  }

  static getAlgorithm() {
    return {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    };
  }

  async getCardHash(cardData: iCardData) {
    const publicKey = await this._fetchPublicKey();
    const binaryKey = this._getBinaryKey(publicKey);
    const encriptedPublicKey = await this._importKey(binaryKey);

    const cardBuffer = this._str2ab(JSON.stringify(cardData));
    const encryptedCard = await this._encryptCardData(
      encriptedPublicKey,
      cardBuffer
    );

    const result = await this._fetchCardHash(encryptedCard);

    if (!result.data) {
      throw new Error("Não foi possível gerar o hash do cartão");
    }

    return result.data;
  }

  async _fetchPublicKey(): Promise<string> {
    const params = qs.stringify({ publicToken: this.publicToken });
    const ENDPOINT = `/get-public-encryption-key.json?${params}`;
    try {
      const { data } = await this.axios.post(ENDPOINT);
      
      return data && data.replace(/(\r\n|\n|\r)/gm, ""); // Remove line breaks
    } catch (error) {
      throw new Error(
        error ||
          "Erro ao gerar a chave pública na API de pagamentos"
      );
    }
  }

  _fetchCardHash(encryptedCard: string | void) {
    const params = qs.stringify({
      publicToken: this.publicToken,
      encryptedData: encryptedCard,
    });
    const ENDPOINT = `/get-credit-card-hash.json?${params}`;
    return this.axios.post(ENDPOINT);
  }

  _getBinaryKey(encodedKey: string) {
    const decodedKey = decode(encodedKey); // Decode base 64
    const binaryKey = this._str2ab(decodedKey); // Transform into an ArrayBuffer
    return binaryKey;
  }

  _importKey(binaryKey: JsonWebKey | ArrayBuffer): Promise<CryptoKey> {
    const algorithm = JunoCardHash.getAlgorithm();

    return new Promise((resolve, reject) =>
      crypto.subtle
        .importKey("spki", binaryKey, algorithm, false, ["encrypt"])
        .then(resolve, reject)
    );
  }

  _encryptCardData(
    publicKey: CryptoKey,
    encodedCardData: ArrayBuffer
  ): Promise<string | void> {
    const algorithm = JunoCardHash.getAlgorithm();
    return new Promise((resolve, reject) =>
      crypto.subtle
        .encrypt(algorithm, publicKey, encodedCardData)
        .then((data: ArrayBuffer) => this._encodeAb(data), reject)
        .then((encoded: string) => resolve(encoded))
    );
  }

  _str2ab(str: string) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  _encodeAb(arrayBuffer: ArrayBuffer) {
    let base64 = "";
    const encodings =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    const bytes = new Uint8Array(arrayBuffer);
    const { byteLength } = bytes;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;

    let a;
    let b;
    let c;
    let d;
    let chunk;

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i += 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
      d = chunk & 63; // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4; // 3   = 2^2 - 1

      base64 += `${encodings[a] + encodings[b]}==`;
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2; // 15    = 2^4 - 1

      base64 += `${encodings[a] + encodings[b] + encodings[c]}=`;
    }

    return base64;
  }

  _configureAxios(environment: ENV) {
    const baseURL =
      environment === ENVIRONMENT.SANDBOX
        ? "https://sandbox.boletobancario.com/boletofacil/integration/api"
        : "https://www.boletobancario.com/boletofacil/integration/api";

    const instance = axios.create({
      baseURL,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    instance.interceptors.response.use(({ data }) => data);

    return instance;
  }
}

export { JunoCardHash };
