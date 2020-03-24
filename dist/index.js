'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var crypto = require('isomorphic-webcrypto');

var _require = require('base-64'),
    decode = _require.decode;

var axios = require('axios');
var qs = require('qs');

var ENVIRONMENT = {
	SANDBOX: 'sandbox',
	PRODUCTION: 'production'
};

var JunoCardHash = function () {
	_createClass(JunoCardHash, null, [{
		key: 'getAlgorithm',
		value: function getAlgorithm() {
			return {
				name: 'RSA-OAEP',
				hash: { name: 'SHA-256' }
			};
		}
	}]);

	function JunoCardHash(publicToken) {
		var environment = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'sandbox';

		_classCallCheck(this, JunoCardHash);

		this.publicToken = publicToken;
		this.environment = environment;
		this.axios = this._configureAxios(this.environment);
	}

	_createClass(JunoCardHash, [{
		key: 'getCardHash',
		value: async function getCardHash(cardData) {
			var publicKey = await this._fetchPublicKey();
			var binaryKey = this._getBinaryKey(publicKey);
			var encriptedPublicKey = await this._importKey(binaryKey);

			var cardBuffer = this._str2ab(JSON.stringify(cardData));
			var encryptedCard = await this._encryptCardData(encriptedPublicKey, cardBuffer);

			var result = await this._fetchCardHash(encryptedCard);

			if (!result.success || !result.data) {
				throw new Error(result.errorMessage || 'Não foi possível gerar o hash do cartão');
			}

			return result.data;
		}
	}, {
		key: '_fetchPublicKey',
		value: function _fetchPublicKey() {
			var params = qs.stringify({ publicToken: this.publicToken });
			var ENDPOINT = '/get-public-encryption-key.json?' + params;
			return this.axios.post(ENDPOINT).then(function (_ref) {
				var data = _ref.data;
				return data.replace(/(\r\n|\n|\r)/gm, "");
			}); // Remove line breaks
		}
	}, {
		key: '_fetchCardHash',
		value: function _fetchCardHash(encryptedCard) {
			var params = qs.stringify({ publicToken: this.publicToken, encryptedData: encryptedCard });
			var ENDPOINT = '/get-credit-card-hash.json?' + params;
			return this.axios.post(ENDPOINT);
		}
	}, {
		key: '_getBinaryKey',
		value: function _getBinaryKey(encodedKey) {
			var decodedKey = decode(encodedKey); // Decode base 64
			var binaryKey = this._str2ab(decodedKey); // Transform into an ArrayBuffer
			return binaryKey;
		}
	}, {
		key: '_importKey',
		value: function _importKey(binaryKey) {
			var algorithm = JunoCardHash.getAlgorithm();
			return new Promise(function (resolve, reject) {
				return crypto.subtle.importKey('spki', binaryKey, algorithm, new Boolean(false), ['encrypt']).then(resolve, reject);
			});
		}
	}, {
		key: '_encryptCardData',
		value: function _encryptCardData(publicKey, encodedCardData) {
			var _this = this;

			var algorithm = JunoCardHash.getAlgorithm();
			return new Promise(function (resolve, reject) {
				return crypto.subtle.encrypt(algorithm, publicKey, encodedCardData).then(function (data) {
					return _this._encodeAb(data);
				}, reject).then(function (encoded) {
					return resolve(encoded);
				});
			});
		}
	}, {
		key: '_str2ab',
		value: function _str2ab(str) {
			var buf = new ArrayBuffer(str.length);
			var bufView = new Uint8Array(buf);
			for (var i = 0, strLen = str.length; i < strLen; i++) {
				bufView[i] = str.charCodeAt(i);
			}
			return buf;
		}
	}, {
		key: '_encodeAb',
		value: function _encodeAb(arrayBuffer) {
			var base64 = '';
			var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

			var bytes = new Uint8Array(arrayBuffer);
			var byteLength = bytes.byteLength;

			var byteRemainder = byteLength % 3;
			var mainLength = byteLength - byteRemainder;

			var a = void 0;var b = void 0;var c = void 0;var d = void 0;
			var chunk = void 0;

			// Main loop deals with bytes in chunks of 3
			for (var i = 0; i < mainLength; i += 3) {
				// Combine the three bytes into a single integer
				chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];

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

				base64 += encodings[a] + encodings[b] + '==';
			} else if (byteRemainder == 2) {
				chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];

				a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
				b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

				// Set the 2 least significant bits to zero
				c = (chunk & 15) << 2; // 15    = 2^4 - 1

				base64 += encodings[a] + encodings[b] + encodings[c] + '=';
			}

			return base64;
		}
	}, {
		key: '_configureAxios',
		value: function _configureAxios(environment) {
			var baseURL = environment === ENVIRONMENT.SANDBOX ? 'https://www.boletobancario.com/boletofacil/integration/api' : 'https://sandbox.boletobancario.com/boletofacil/integration/api';

			var instance = axios.create({
				baseURL: baseURL,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			});

			instance.interceptors.response.use(function (_ref2) {
				var data = _ref2.data;
				return data;
			});

			return instance;
		}
	}]);

	return JunoCardHash;
}();

exports.JunoCardHash = JunoCardHash;