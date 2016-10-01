import eth from 'ethereumjs-util';
import crypto from 'crypto';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

export class Application {

    constructor() {
        this._secretChallenge = "QUICKBROWNMOOSEJUMPEDOVERTHEFENCEANDBROKEHERLEG"; //some random text would
    }

    attachStorage(storage) {
        this._storage = storage;
        return this;
    }


    keys() {
        if (!this.isUnlocked()) {
            return false
        }

        let _enckeys = JSON.parse(this._storage.getItem("keys"));
        return _enckeys.map((k) => eth.toBuffer("0x" + AES.decrypt(k, this._secret).toString(Utf8)))
    }

    addresses() {
        let _keys = this.keys();
        console.log("keys: ", _keys);
        return _keys.map((k) => eth.bufferToHex(pubToAddress(privateToPublic(k))))
    }

    storeNewKey(newKeyHex) {
        // if newKeyHex is applied, then it is added, otherwise new key generated

        if (!this.isUnlocked()) {
            return false;
        }
        let keysArray = JSON.parse(this._storage.getItem("keys")) || [];
        let newPriv = newKeyHex? eth.toBuffer(newKeyHex) : generatePrivate();

        let encryptedKey = AES.encrypt(newPriv.toString("hex"), this._secret);
        keysArray.push(encryptedKey.toString());
        this._storage.setItem("keys", JSON.stringify(keysArray));
        return pubToAddress(privateToPublic(newPriv));
    }

    isUnlocked() {
        return !!this._secret
    }

    unlock(secret) {
        if (AES.decrypt(this._storage.getItem("encryptedChallenge"), secret) == this._secretChallenge) {
            this._secret = secret;
            return true;
        }
        return false;
    }

    initLocalStorage(secret) {
        this._secret = secret;
        this._storage.setItem("encryptedChallenge", AES.encrypt(this._secretChallenge, this._secret));
    }

    sendToEstonianIdCode(idCode, amount, ref) {

        //call id.euro2.ee/v1/get/toIDCode to get 38008030201

        //figure out which address has enough balance to send from
        // recursively call send

        let bal = this.balances();

        //if we don't have enough money then fail


        let sentAmount = 0;
        bal.forEach((addr, data) => {
            // if min(data.balance, amount-sentAmount)
        });

    }

    send(fromaddr, toaddr, amount, ref) {
        // the piecemeal lower level send
        //call wallet.euro2.ee:8080/vi/get/delegateNonce for the address

        //sign with the key relating to the address

        //send to wallet.euro2.ee
    }


    getFee() {

        //TODO: get from wallet.euro2.ee

        return 0.01;
    }

    balanceOfAddress(address) {
        //ask balance from wallet
        return 155.22
    }

    isAddressApproved(address) {

        //ask that from wallete
        return true;
    }

    balances() {

        let _addresses = this.addresses();

        let address_data = _addresses.reduce((prev, curr) => {
            prev[curr] = {"balance": this.balanceOfAddress(curr), "approved": this.isAddressApproved(curr)}
            return prev;
        }, {});
        return address_data;
    }

    importKey(keyHex) {

        //TODO:should check if it is valid hex with 0x
        //TODO:should check if that key already exists in storage

        this.storeNewKey(keyHex);
    }

    storeEstonianIdCode(idCode) {
        //place ID code to localstorage
        let currentIdCode = this._storage.getItem("EstonianIdCode");
        if (currentIdCode) {
            if (parseInt(currentIdCode) != parseInt(idCode)) {
                // we're in trouble - he had another ID code before
                return false;
            } else {
                this._storage.setItem("EstonianIdCode", idCode);
                return true;
            }
        }
    }

    getEstonianIdCode() {
        return this._storage.getItem("EstonianIdCode");
    }

    getNameFromEstonianIdCode(idCode) {
        //TODO: use id.euro2.ee calls to get for idcode
        return "Toomas Tamm";
    }

    approveWithEstonianMobileId(address, phonenumber, callback) {
        // use id.euro2.ee
        // should return IdCode
        return 38008030332
    }

    approveWithEstonianIdCard(address, callback) {
        // use id.euro2.ee but not sure how
        //
        // should return IdCode
        return 38008030332
    }

    approveWithEstonianBankTransfer(address, callback) {
        // use id.euro2.ee to get the secret reference

        return "moose shoes black"
    }
}

export function generatePrivate() {
    let buf;
    do buf = crypto.randomBytes(32); while (!eth.isValidPrivate(buf));
    return buf;
}

export function privateToPublic(privateKey) {
    return eth.privateToPublic(privateKey)
}

export function pubToAddress(publicKey) {
    return eth.pubToAddress(publicKey)
}

/*let privateKey = _generatePrivate();
 let publicKey = _privateToPublic(privateKey);
 let addr = _pubToAddress(publicKey);

 document.querySelector('body').innerHTML = addr.toString("hex");*/

var app = new Application();
app.attachStorage(window.localStorage);
app.initLocalStorage("mypass");
console.log(app.isUnlocked());

/*

 var trialkey = generatePrivate();
 console.log("trialkey: ", trialkey);
 console.log("trialkey-hex: ", trialkey.toString("hex"));

 var testcrypt = AES.encrypt(trialkey.toString("hex"),"mypass").toString();
 console.log("testcrypt: ", testcrypt);

 var decrypted = AES.decrypt(testcrypt,"mypass").toString(CryptoJS.enc.Utf8);
 console.log("decrypted ",decrypted);
 console.log(parseInt(decrypted,16));
 console.log(decrypted.toString(16));
 console.log(eth.toBuffer("0x"+decrypted));

 //console.log(AES.decrypt(testcrypt,"mypass").toString(CryptoJS.enc.Utf8));
 */

var addr = app.storeNewKey();
app.storeNewKey("0x0faf1af8b4cbeadb3b8fc2c2dfa2e3642575cd0c166cda731738227371768595");
var addrs = app.addresses();
console.log(addrs);
console.log(app.balances());
