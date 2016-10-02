import eth from 'ethereumjs-util';
import crypto from 'crypto';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import http from 'http';
import * as Utils from './Utils';

import MobileId from './providers/MobileId';

export class Application {

    constructor() {
        this._secretChallenge = "QUICKBROWNMOOSEJUMPEDOVERTHEFENCEANDBROKEHERLEG"; //some random text would
        this.ID_SERVER = "http://id.euro2.ee:8080/v1/";
        this.WALLET_SERVER = "http://wallet.euro2.ee:8080/v1/";
    }

    attachStorage(storage) {
        this._storage = storage;
        return this;
    }


    keys() {
        if (!this.isUnlocked()) {
            return [];
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
        let newPriv = newKeyHex ? eth.toBuffer(newKeyHex) : generatePrivate();

        let encryptedKey = AES.encrypt(newPriv.toString("hex"), this._secret);
        keysArray.push(encryptedKey.toString());
        this._storage.setItem("keys", JSON.stringify(keysArray));
        return pubToAddress(privateToPublic(newPriv));
    }

    isUnlocked() {
        return !!this._secret
    }

    initiated() {
        if (!this._storage) throw "Storage has not been initiated.";
        return !!this._storage.getItem("encryptedChallenge");
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

        return this.getAddressForEstonianIdCode(idCode).then((toaddr) => {

            if (!toaddr) return;

            return this.contractDataAsync().then((bal) => {
                //let sentAmount = 0;

                for (data in bal) {
                    console.log("Balance of", data.address, " ", data.balance);
                    if (data.balance > this.getFee() + amount) {
                        return this.sendAsync(toaddr, amount, ref, data);
                        //return true;
                    }
                }
                ;

            });
        });


        /*
         fees = 5 * this.getFee() // randomly assuming 5 transactions
         if (this.balance() < amount + fees) {
         return false;
         }
         */


    }

    //TODO: should move to utils
    uint256Hex(_number) {
        //convert to hex of uint256
        var zeros32 = "0000000000000000000000000000000000000000000000000000000000000000"
        var hex = "" + _number.toString(16).slice(2)
        var padded = zeros32.substring(0, zeros32.length - hex.length) + hex
        return padded;
    };


    sendAsync(toaddr, amount, ref, _data) {
        // the piecemeal lower level send
        //call wallet.euro2.ee:8080/vi/get/delegateNonce for the address

        //sign with the key relating to the address

        let nonce = _data.nonce + 1;
        let fee = this.getFee();

        // create a signed transfer
        let ec2 = eth.ecsign(eth.sha3("0x"
            + _data.address
            + toaddr
            + this.uint256Hex(amount)
            + this.uint256Hex(fee)
            + this.uint256Hex(nonce)
        ), _data.privKey);

        // signature can be copied from here to the mist browser and executed from there
        /*
         console.log("ec.v: " + ec2.v);
         console.log("ec.r: " + eth.bufferToHex(ec2.r));
         console.log("ec.s: " + eth.bufferToHex(ec2.s));
         */
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
            "sourceAccount": "0x" + _data.address,
            "targetAccount": "0x" + toaddr,
            "signature": eth.bufferToHex(ec2.r)
            + eth.bufferToHex(ec2.s) + ec2.v
        };
        // console.log(postData);
        // console.log(JSON.stringify(postData));

        return Utils.xhrPromise(this.WALLET_SERVER + "sendDelegated", postData, "POST").then((response) => {
            return JSON.parse(response)
        });

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
        // var promise = Utils.xhrPromise(this.WALLET_SERVER+"fees");
        // return promise

        return 0.01;
    }

    contractDataByAddressAsync(address) {
        //TODO: call wallet.euro2.ee:8080/vi/get/delegateNonce for the address
        return Utils.xhrPromise(this.WALLET_SERVER + "accounts/" + address).then((response) => {
            return JSON.parse(response)
        });
    }

    transactionsByAddressAsync(address) {
        //TODO:
        return Utils.xhrPromise(this.WALLET_SERVER+"accounts/"+address+"/transactions").then( (response) => {
		return JSON.parse(response)
	} );
    }

    transactionsAsync() {

        let _addresses = this.addresses();

        let addressPromiseArray = _addresses.map((addr) => {
            return this.transactionsAsync(addr).then( (parsedResponse) => {
                return {
		    address: addr,
                    sourceAccount: parsedResponse.sourceAccount,
                    targetAccount: parsedResponse.targetAccount,
                    transactionHash: parsedResponse.approved // move to parsedResponse.transactionHash;
                }
            })
        });

        return Promise.all(addressPromiseArray)

    }

    contractDataAsync() {

        let _keys = this.keys();

        let keysPromiseArray = _keys.map((key) => {
            let addr = eth.bufferToHex(pubToAddress(privateToPublic(key)));
            return this.contractDataByAddressAsync(addr).then((response) => {
                return {
                    address: addr,
                    privKey: key,
                    balance: response.balance,
                    nonce: response.nonce,
                    approved: response.approved
                }
            })
        });

        return Promise.all(keysPromiseArray)

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
        return Utils.xhrPromise(this.ID_SERVER + "accounts?ownerId=" + idCode).then((response) => {
            console.log("id return: ", JSON.parse(response));
            let firstAddress = JSON.parse(response).accounts[0]
            if (firstAddress) return firstAddress.address;
            //return "0xcE8A7f7c35a2829C6554fD38b96A7fF43B0A76d6";
        });

        //return "0xcE8A7f7c35a2829C6554fD38b96A7fF43B0A76d6";
    }


    approveWithEstonianMobileId(address, phonenumber, callback) {
        let idServerUrl = 'http://id.euro2.ee:8080/';

        let pollStatus = (authIdentifier) => Utils.xhrPromise(idServerUrl + '/v1/accounts', {
            authIdentifier: authIdentifier
        }, 'POST').then((res) => {
            res = JSON.parse(res)
            switch (res.authenticationStatus) {
                case 'LOGIN_SUCCESS':
                    return res;
                    break;
                case 'LOGIN_EXPIRED':
                case 'LOGIN_FAILURE':
                    return false;
                    break;
                default:
                    return new Promise((resolve) => setTimeout(resolve, 3000))
                        .then(() => pollStatus(authIdentifier));
                    break;
            }
        });

        return Utils.xhrPromise(idServerUrl + '/v1/authorisations', {
            accountAddress: address,
            phoneNumber: phonenumber
        }, 'POST').then((res) => pollStatus(JSON.stringify(res).authIdentifier));


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


/*


 var app = new Application();
 app.attachStorage(window.localStorage);
 app.initLocalStorage("mypass");
 console.log("Unlocked? ",app.isUnlocked());
 var addr = app.storeNewKey();
 app.storeNewKey("0x0faf1af8b4cbeadb3b8fc2c2dfa2e3642575cd0c166cda731738227371768595");
 var addrs = app.addresses();
 //console.log(addrs);
 //console.log(app.balances());
 //console.log(app.sendToEstonianIdCode(3909323,3.22,""));


 // new MobileId();
 app.sendToEstonianIdCode(39009143711,7,"").then( (data) => console.log("final out: ",data)).catch( (err) => {console.log("we failed ",err)} )
 //app.getAddressForEstonianIdCode(3904343143711).then( (data) => console.log("final out: ",data))
 //app.getAddressForEstonianIdCode(39009143711).then( (data) => console.log("final out: ",data))
 app.contractDataByAddressAsync("asdasdasda").then((data) => console.log(data));
 //app.balanceOfAddress("sdsdsd").then( (data) => console.log(data))
 */
