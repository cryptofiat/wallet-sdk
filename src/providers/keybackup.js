"use strict";
exports.__esModule = true;
var eth = require("ethereumjs-util");
var crypto_js_1 = require("crypto-js");
// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  
// RUN $> tsc Backup.ts BEFORE  COMMIT
var KeyBackup = /** @class */ (function () {
    function KeyBackup(plainkey, password) {
        this.active = true;
        if (plainkey && password) {
            this.address = eth.bufferToHex(eth.pubToAddress(eth.privateToPublic(plainkey)));
            this.keyEnc = crypto_js_1.AES.encrypt(plainkey.toString('base64'), password).toString();
        }
    }
    ;
    KeyBackup.prototype.toPlainkey = function (password) {
        if (!this.keyEnc) {
            return null;
        }
        return Buffer.from(crypto_js_1.AES.decrypt(this.keyEnc, password).toString(crypto_js_1.enc.Utf8), 'base64');
    };
    return KeyBackup;
}());
exports.KeyBackup = KeyBackup;
