"use strict";
exports.__esModule = true;
var Utils = require("./Utils");
var crypto_js_1 = require("crypto-js");
var crypto = require("crypto");
// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  
// RUN $> tsc Backup.ts BEFORE  COMMIT
var Backup = /** @class */ (function () {
    function Backup(storage) {
        this.storage = storage;
        this.BACKUP_SERVER = "https://account-identity.euro2.ee/v1/backup/";
    }
    ;
    Backup.prototype.setFirstPassword = function (password, idCode) {
        // server takes  plaintext  in base64, but the encrypt funciton takes raw bytes 
        var _plaintext_64 = crypto.randomBytes(24).toString('base64');
        var _plaintext = window.atob(_plaintext_64);
        var postData = {
            idCode: idCode,
            active: true,
            plaintext: _plaintext_64,
            newEncrypted: crypto_js_1.AES.encrypt(_plaintext, password).toString()
        };
        //console.log("setting pwd: ",JSON.stringify(postData));
        return Utils.xhrPromise(this.BACKUP_SERVER + "challenge", JSON.stringify(postData), "PUT").then(function () { return true; }, function () { return false; });
    };
    Backup.prototype.verifyPassword = function (password, idCode) {
        var _this = this;
        // check if pwd is correct
        return this.hasBackup(idCode).then(function (encrypted) {
            var postData = {
                encrypted: encrypted,
                plaintext: window.btoa(crypto_js_1.AES.decrypt(encrypted, password).toString(crypto_js_1.enc.Utf8))
            };
            return Utils.xhrPromise(_this.BACKUP_SERVER + "challenge", JSON.stringify(postData), "POST").then(function (json) {
                var jsonParsed = JSON.parse(json);
                _this.password = password;
                _this.challenge = jsonParsed.plaintext;
                return true;
            }, function (err) { console.log("error: ", err); return false; });
        }, function () { return false; });
    };
    ;
    Backup.prototype.hasBackup = function (idCode) {
        return Utils.xhrPromise(this.BACKUP_SERVER + "challenge?idCode=" + idCode, null, "GET").then(function (json) {
            var jsonParsed = JSON.parse(json);
            return jsonParsed.encrypted;
        }, function () { return null; });
    };
    ;
    Backup.prototype.syncKeys = function (_keys) {
        if (!this.challenge) {
            return null;
        }
        var postData = {
            challenge: this.challenge,
            keys: _keys
        };
        return Utils.xhrPromise(this.BACKUP_SERVER + "keys", JSON.stringify(postData), "POST").then(function (json) {
            var jsonParsed = JSON.parse(json);
            //console.log("returned keys: ", jsonParsed.keys);
            return jsonParsed.keys;
        }, function (err) { console.log("Error syncing keys", err); return null; });
    };
    return Backup;
}());
exports["default"] = Backup;
;
