const crypto = require('isomorphic-webcrypto');
const { decode } = require('base-64');
const axios = require('axios');
const qs = require('qs');

const ENVIRONMENT = {
	SANDBOX: 'sandbox',
	PRODUCTION: 'production',
};

class JunoCardHash {

	static getAlgorithm() {
		return {
			name: 'RSA-OAEP',
			hash: { name: 'SHA-256' },
		};
	}

	constructor(publicToken, environment = 'sandbox') {
		this.publicToken = publicToken;
		this.environment = environment;
		this.axios = this._configureAxios(this.environment);
	}
	
	async getCardHash(cardData) {
		const publicKey = await this._fetchPublicKey();
		const binaryKey = this._getBinaryKey(publicKey);
		const encriptedPublicKey = await this._importKey(binaryKey);

		const cardBuffer = this._str2ab(JSON.stringify(cardData));
		const encryptedCard = await this._encryptCardData(encriptedPublicKey, cardBuffer);

		const result = await this._fetchCardHash(encryptedCard);

		if (!result.success || !result.data) {
			throw new Error(result.errorMessage || 'Não foi possível gerar o hash do cartão');
		}

		return result.data;
	}


	_fetchPublicKey() {
		const params = qs.stringify({ publicToken: this.publicToken });
		const ENDPOINT = `/get-public-encryption-key.json?${params}`;
		return this.axios.post(ENDPOINT)
			.then(({ data }) => data.replace(/(\r\n|\n|\r)/gm,"")) // Remove line breaks
	}

	_fetchCardHash(encryptedCard) {
		const params = qs.stringify({ publicToken: this.publicToken, encryptedData: encryptedCard });
		const ENDPOINT = `/get-credit-card-hash.json?${params}`;
		return this.axios.post(ENDPOINT)
	}


	_getBinaryKey(encodedKey) {
		const decodedKey = decode(encodedKey); // Decode base 64
		const binaryKey = this._str2ab(decodedKey); // Transform into an ArrayBuffer
		return binaryKey;
	}
	  
	_importKey(binaryKey) {
		const algorithm = JunoCardHash.getAlgorithm();
		return new Promise((resolve, reject) => crypto.subtle
	    .importKey('spki', binaryKey, algorithm, new Boolean(false), ['encrypt'])
			.then(resolve, reject));
	}
  
	_encryptCardData(publicKey, encodedCardData) {
		const algorithm = JunoCardHash.getAlgorithm();
		return new Promise((resolve, reject) => crypto.subtle
			.encrypt(algorithm, publicKey, encodedCardData)
			.then((data) => this._encodeAb(data), reject)
			.then((encoded) => resolve(encoded)));
	}

	_str2ab(str) {
		const buf = new ArrayBuffer(str.length);
		const bufView = new Uint8Array(buf);
		for (let i = 0, strLen = str.length; i < strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}

	_encodeAb(arrayBuffer) {
		let base64 = '';
		const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

		const bytes = new Uint8Array(arrayBuffer);
		const { byteLength } = bytes;
		const byteRemainder = byteLength % 3;
		const mainLength = byteLength - byteRemainder;

		let a; let b; let c; let
			d;
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
  
	_configureAxios(environment) {
		const baseURL = environment === ENVIRONMENT.SANDBOX
			? 'https://www.boletobancario.com/boletofacil/integration/api'
			: 'https://sandbox.boletobancario.com/boletofacil/integration/api';
		
		const instance = axios.create({ 
			baseURL,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		});

		instance.interceptors.response.use(({data}) => data);

		return instance;
	}

}

exports.JunoCardHash = JunoCardHash;