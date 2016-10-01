import eth from 'ethereumjs-util';
import crypto from 'crypto';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

import MobileId from './providers/MobileId';

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

        //call id.euro2.ee/v1/get/toIDCode to get address for 38008030201

        //figure out which address has enough balance to send from
        // recursively call send
        let toaddr = this.getAddressForEstonianIdCode(idCode);
        let bal = this.balances();

        //if we don't have enough money then fail

        /*
        fees = 5 * this.getFee() // randomly assuming 5 transactions
        if (this.balance() < amount + fees) {
            return false;
        }
        */

        let sentAmount = 0;
        for (var addr in bal) {
            console.log("Balance of", addr, " ", bal[addr].balance);
            if (bal[addr].balance > this.getFee() + amount) {
                this.send(addr,toaddr,amount,ref,bal[addr].privKey);
                return true;
            }
        }

           // if min(data.balance, amount-sentAmount)

    }

    //TODO: should move to utils
    uint256Hex(_number){
		//convert to hex of uint256
		var zeros32="0000000000000000000000000000000000000000000000000000000000000000"
		var hex = ""+_number.toString(16).slice(2)
		var padded = zeros32.substring(0, zeros32.length - hex.length) + hex
		return padded;
    };


    send(fromaddr, toaddr, amount, ref, privKey) {
        // the piecemeal lower level send
        //call wallet.euro2.ee:8080/vi/get/delegateNonce for the address

        //sign with the key relating to the address

        let nonce = this.getDelegatedNonce(fromaddr);
        let fee = this.getFee();

		// create a signed transfer
	let ec2 = eth.ecsign(eth.sha3("0x"
				+ fromaddr
				+ toaddr
				+ this.uint256Hex(amount)
				+ this.uint256Hex(fee)
				+ this.uint256Hex(nonce)
        ), privKey);

		// signature can be copied from here to the mist browser and executed from there
	console.log("ec.v: " + ec2.v);
	console.log("ec.r: " + eth.bufferToHex(ec2.r));
	console.log("ec.s: " + eth.bufferToHex(ec2.s));

		// or copy the whole data and send to the contract
        /*
       	var data = "0x" + keccak_256("delegatedTransfer(address,address,uint256,uint256,uint256,uint8,bytes32,bytes32,address)").substring(0, 8)
			+ this.paddedAddress(_from)
			+ this.paddedAddress(to)
			+ this.uint256Hex(amount)
			+ this.uint256Hex(fee)
			+ this.uint256Hex(nonce)
			+ this.uint256Hex(ec2.v)
			+ ethUtil.stripHexPrefix(ethUtil.bufferToHex(ec2.r))
			+ ethUtil.stripHexPrefix(ethUtil.bufferToHex(ec2.s))
			+ this.paddedAddress(_from);

		console.log("Constructed data for delegateTransfer call: "+data);
           */
	var postData = {
			"amount": amount,
			"fee": fee,
			"nonce": nonce,
			"reference": "",
			"sourceAccount": "0x"+fromaddr,
			"targetAccount": "0x"+toaddr,
			"signature": eth.bufferToHex(ec2.r)
			+ eth.bufferToHex(ec2.s) + ec2.v
			};
	console.log(postData);
	console.log(JSON.stringify(postData));
        /*
		Utils.xhr(EtheriumService.GATEWAY_URL + '/v1/transfers', JSON.stringify(postData), (res)=> {
		    var data = JSON.parse(res);
		    console.log('Transfer hash:', data.id);
		    if (parseInt(data.id,16) == 0) {
			console.log("Submit failed by wallet-server. Check if account unlocked and sufficient eth.");
			document.querySelector("#status-data").innerHTML = "Submit failed on server.";
		    } else {
			document.querySelector("#status-data").innerHTML = 'Submitted <a href=https://etherscan.io/tx/"'+data.id+'">tx</a>';
		    }
		},'POST', (err) => {
			document.querySelector("#status-data").innerHTML = "Server rejected submit.";
			console.log(err);
		});
	}
        */


    }


    getFee() {

        //TODO: get from wallet.euro2.ee

        return 0.01;
    }

    getDelegatedNonce(address) {
        //TODO: call wallet.euro2.ee:8080/vi/get/delegateNonce for the address
        return 2;
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

        let _keys = this.keys();

        let address_data = _keys.reduce((prev, curr) => {
            addr = eth.bufferToHex(pubToAddress(privateToPublic(curr)));
            prev[addr] = {"balance": this.balanceOfAddress(addr),
                          "approved": this.isAddressApproved(addr),
                          "privKey": curr
                          }
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

    getAddressForEstonianIdCode(idCode) {

        //TODO: use id.euro2.ee calls to get address for idcode

        return "0xcE8A7f7c35a2829C6554fD38b96A7fF43B0A76d6";
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


/* document.querySelector('body').innerHTML = addr.toString("hex");*!/

var app = new Application();
app.attachStorage(window.localStorage);
app.initLocalStorage("mypass");
console.log(app.isUnlocked());*/

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

/*
var addr = app.storeNewKey();
app.storeNewKey("0x0faf1af8b4cbeadb3b8fc2c2dfa2e3642575cd0c166cda731738227371768595");
var addrs = app.addresses();
console.log(addrs);
console.log(app.balances());
console.log(app.sendToEstonianIdCode(3909323,3.22,""));

*/

new MobileId();
