import eth from 'ethereumjs-util';
import crypto from 'crypto';
import AES from 'crypto-js/aes';
import CryptoJS from 'crypto-js';

export class Application {

    constructor() {
         var _secretChallenge = "QUICKBROWNMOOSEJUMPEDOVERTHEFENCEANDBROKEHERLEG"; //some random text would
         var _storage;
         var _secret;
    }

    attachStorage(storage) {
         this._storage = storage;
         return this;
    }
    hasAddresses() {
         //mock
         //let _keys = this._storage.getItem("keys");
         //if(sizeof(_keys) > 0) return true else return false;
         return true;
    }
    
    keys() {
         //mock
         //if(sizeof(_keys) > 0) return true else return false;

         // returns array?
         if (!this.isUnlocked()) { return false };

         let _enckeys = JSON.parse(this._storage.getItem("keys"));
         console.log("enckeys: ", _enckeys);
         let _openkeys = _enckeys.map( (k) => {
            console.log(AES.decrypt(k,this._secret).toString(CryptoJS.enc.Utf8));
	    return eth.toBuffer(AES.decrypt(k,this._secret).toString(CryptoJS.enc.Utf8));
         })
         return _openkeys;
    }

    addresses() {
         let _keys = this.keys();
         console.log("keys: ", _keys);
         let _addr = _keys.map( function(k) {
            console.log("start",k);
            var pub = privateToPublic(k);
            console.log("next",pub);
            var addr = pubToAddress(pub)
            console.log("next",addr);
            return pubToAddress(privateToPublic(k));
         })
         return _addr;
    }

    storeNewKey() {
	if (!this.isUnlocked()) { return false; }
        let keysArray = this._storage.getItem("keys");
        let newPriv = generatePrivate();
	console.log("key: ",newPriv);
        if (!keysArray) { keysArray = []; }

        let encryptedKey = AES.encrypt(newPriv.toString("hex"),this._secret);
        keysArray.push(encryptedKey.toString());
        console.log("printkeys:",keysArray);
        this._storage.setItem("keys", JSON.stringify(keysArray));
	return pubToAddress(privateToPublic(newPriv));
    }

    isUnlocked() {
         if (this._secret) { return true } else {return false }; // boolean
    }

    unlock(secret) {
         if (AES.decrypt(this._storage.getItem("encryptedChallenge"),secret) == this._secretChallenge) { 
             this._secret = secret;
             return true; 
         }
         return false;
    }

    initLocalStorage(secret) {
        this._secret = secret;
        this._storage.setItem("encryptedChallenge", AES.encrypt(this._secretChallenge, this._secret));
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

/*mock*/
export function balanceMock() {
    return 123.45;
}

export function identityCodeMock() {
    return 38008030123;
}

/*let privateKey = _generatePrivate();
 let publicKey = _privateToPublic(privateKey);
 let addr = _pubToAddress(publicKey);

 document.querySelector('body').innerHTML = addr.toString("hex");*/

var app = new Application();
app.attachStorage(window.localStorage);
app.initLocalStorage("mypass");
console.log(app.isUnlocked());

var trialkey = generatePrivate();
console.log("trialkey: ", trialkey);
console.log("trialkey-hex: ", trialkey.toString("hex"));

var testcrypt = AES.encrypt(trialkey.toString("hex"),"mypass").toString();
console.log("testcrypt: ", testcrypt);

var decrypted = AES.decrypt(testcrypt,"mypass").toString(CryptoJS.enc.Utf8);
console.log("decrypted ",decrypted);
console.log(parseInt(decrypted,16));
console.log(eth.toBuffer(decrypted));
/*
//console.log(AES.decrypt(testcrypt,"mypass").toString(CryptoJS.enc.Utf8));
*/
var addr = app.storeNewKey();
var addrs = app.addresses();
console.log(addrs);
document.querySelector('body').innerHTML = addr.toString("hex");
