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
        this.ID_SERVER_HTTPS = "https://id.euro2.ee/v1/";
        this.WALLET_SERVER = "http://wallet.euro2.ee:8080/v1/";
        this.REF_SERVER = "http://wallet.euro2.ee:8000/";
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

    pubToAddress(pubKey){
        return pubToAddress(pubKey)
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
        return privateToPublic(newPriv);
    }

    isUnlocked() {
        return !!this._secret
    }

    initiated() {
        if (!this._storage) throw "Storage has not been initiated.";
        return !!this._storage.getItem("encryptedChallenge");
    }

    unlock(secret) {
        if (AES.decrypt(this._storage.getItem("encryptedChallenge"), secret).toString(Utf8) == this._secretChallenge) {
            this._secret = secret;
            return true;
        }
        return false;
    }

    initLocalStorage(secret) {
        this._secret = secret;
        this._storage.setItem("encryptedChallenge", AES.encrypt(this._secretChallenge, this._secret).toString());
    }

    sendToEstonianIdCode(idCode, amount, ref) {

        //call id.euro2.ee/v1/get/toIDCode to get address for 38008030201

        //figure out which address has enough balance to send from
        // recursively call send

        return this.getAddressForEstonianIdCode(idCode).then((toaddr) => {

            console.log("sending to: "+toaddr)
            if (!toaddr) return;

            return this.contractDataAsync().then((bal) => {
                //let sentAmount = 0;

		//TODO: this should be able to split between  multiple  addresses
                for (var i in bal) {
		    let account = bal[i];
                    console.log("Balance of ", account.address, " is ", account.balance);
                    if (account.balance > this.getFee() + amount) {
                        return this.sendAsync(toaddr, amount, ref, account);
                        //return true;
                    }
                }
                return ({err:"no address has enough balance to send "+amount});

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
        var hex = "" + _number.toString(16)
        var padded = zeros32.substring(0, zeros32.length - hex.length) + hex
        return padded;
    };


    sendAsync(toaddr, amount, ref, _data) {
        // the piecemeal lower level send
        //call wallet.euro2.ee:8080/vi/get/delegateNonce for the address

        //sign with the key relating to the address

        let nonce = _data.nonce + 1;
        let fee = this.getFee();

        let shainput = "0x";
	shainput = shainput.concat(
            this.uint256Hex(nonce),
            toaddr,
            this.uint256Hex(amount),
            this.uint256Hex(fee)
        );

        let sha = eth.sha3(shainput);


        // create a signed transfer
        let ec2 = eth.ecsign(sha, _data.privKey);

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
            "sourceAccount": _data.address,
            "targetAccount": "0x" + toaddr,
//            "sig-r": eth.bufferToHex(ec2.r),
//            "sig-s": eth.bufferToHex(ec2.s),
//            "sig-v": eth.bufferToHex(ec2.v),
	    //TODO: the wallet-server should take the signature hex with 0x
            "signature": eth.bufferToHex(ec2.r).slice(2)
            + eth.bufferToHex(ec2.s).slice(2) + ec2.v.toString(16)
        };
        console.log("postData: ", postData);
        //console.log(JSON.stringify(postData));

        return Utils.xhrPromise(this.WALLET_SERVER + "transfers", JSON.stringify(postData), "POST").then((response) => {
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

        return 1;
    }

    contractDataByAddressAsync(address) {
        //TODO: call wallet.euro2.ee:8080/vi/get/delegateNonce for the address
        return Utils.xhrPromise(this.WALLET_SERVER + "accounts/" + address).then((response) => {
            return JSON.parse(response)
        });
    }

    transfersByAddressAsync(address) {
        //TODO:
        return Utils.xhrPromise(this.WALLET_SERVER+"accounts/"+address+"/transfers").then( (response) => {
		//console.log("some  response: ", JSON.parse(response))
		return JSON.parse(response)
	} );
    }

    transfersAsync() {

        let _addresses = this.addresses();

        let addressPromiseArray = _addresses.map((addr) => {
            return this.transfersByAddressAsync(addr).then( (transferArray) => { return transferArray.map((parsedResponse) => {
                if (parsedResponse.sourceAccount != parsedResponse.targetAccount) { return {
		    address: addr,
		    amount: parsedResponse.amount,
                    sourceAccount: parsedResponse.sourceAccount,
                    targetAccount: parsedResponse.targetAccount,
                    transactionHash: parsedResponse.id, 
		    timestamp: parsedResponse.timestamp,
		    otherAddress: (parsedResponse.sourceAccount != addr) ? parsedResponse.sourceAccount : parsedResponse.targetAccount,
		    signedAmount: (parsedResponse.sourceAccount == addr) ? -parsedResponse.amount : parsedResponse.amount
               } } 
            }) })
        });

        return Promise.all(addressPromiseArray)

    }


    transfersCleanedAsync() {
      return this.transfersAsync().then( (result) => { 
         let cleaning = [];
         result.map((resultel) => { 
		cleaning = cleaning.concat(resultel);
         });

	 // read references for these transactions
	 let cleanedAndReferenced = cleaning.filter(Boolean).map( (tx) => {
             return this.referenceAsync(stripHexPrefix(tx.transactionHash)).then( (ref) => {
		 tx.ref = ref;
                 return tx;
             });
	 });
         return Promise.all(cleanedAndReferenced);
      } );
    }

    balanceTotalAsync() {

      // once all balances have been synced, then calculate total

      let balanceSummariser = (addressArray) => {
          return addressArray.reduce( (prev,next) => prev + next.balance , 0 );
      }

      return this.contractDataAsync()
        .then( balanceSummariser );

    }

    contractDataAsync() {

        let _keys = this.keys();

        let keysPromiseArray = _keys.map((key) => {
            let addr = eth.bufferToHex(pubToAddress(privateToPublic(key)));
            return this.contractDataByAddressAsync(addr).then((response) => {
                return {
                    address: addr,
                    privKey: key,
                    privKeyHex: eth.bufferToHex(key),
                    balance: response.balance,
                    nonce: response.nonce,
                    approved: response.approved,
                    closed: response.closed,
                    frozen: response.frozen
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
            } 
        } else {
                this._storage.setItem("EstonianIdCode", idCode);
                return true;
        }
    }

    getEstonianIdCode() {
        let idCode = this._storage.getItem("EstonianIdCode");
	if (idCode) {
            return idCode;
        } else return "inactive";
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

        let pollStatus = (authIdentifier) => Utils.xhrPromise(this.ID_SERVER + 'accounts', JSON.stringify({
            authIdentifier: authIdentifier
        }), 'POST').then((res) => {
            res = JSON.parse(res);
            switch (res.authenticationStatus) {
                case 'LOGIN_SUCCESS':
                    return res.ownerId;
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

        return Utils.xhrPromise(this.ID_SERVER + 'authorisations', JSON.stringify({
            accountAddress: address,
            phoneNumber: phonenumber
        }), 'POST').then((res) => {
            res = JSON.parse(res);
            callback(res);
            return pollStatus(res.authIdentifier);
        });


    }

    approveWithEstonianIdCard(address) {

        return Utils.xhrPromise(this.ID_SERVER_HTTPS + 'authorisations/idCards', JSON.stringify({
            accountAddress: address,
	    phoneNumber: "000000"
        }), 'POST', true).then((res) => {
            res = JSON.parse(res);
            switch (res.authenticationStatus) {
                case 'LOGIN_SUCCESS':
                    return res.ownerId;
                    break;
                case 'LOGIN_EXPIRED':
                case 'LOGIN_FAILURE':
                    return false;
                    break;
            }
        });
    }

    approveWithEstonianBankTransfer(address, callback) {
        // use id.euro2.ee to get the secret reference

        return "moose shoes black"
    }

    transferStatusAsync(transactionHash) {
	// Returns response.status: PENDING or response.status: SUCCESSFUL
        //TODO: call wallet.euro2.ee:8080/vi/get/delegateNonce for the address
        return Utils.xhrPromise(this.WALLET_SERVER + "transfers/" + transactionHash).then((response) => {
            return JSON.parse(response)
        });
    }

    referenceSendAsync(transactionHash,senderIdCode,receiverIdCode,referenceText,referenceCode,attachments) {
        let postRef = {};
	postRef.senderIdCode = senderIdCode;
	postRef.receiverIdCode = receiverIdCode;
	postRef.referenceText = referenceText;
	postRef.referenceCode = referenceCode;
        return Utils.xhrPromise(this.REF_SERVER + transactionHash, JSON.stringify(postRef), "POST").then((response) => {
            return true; 
        });
    }

    referenceAsync(transactionHash) {
        return Utils.xhrPromise(this.REF_SERVER + transactionHash).then((response) => {
            return JSON.parse(response)
        });
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

export function stripHexPrefix(str) {
    return eth.stripHexPrefix(str)
}


/*
 var app = new Application();
 app.referenceSendAsync("cf36f36b5ed7f84a764671c4a7ef81380e7fadcaea2014c1f0b0963bac6fae00","38008030265","48308260321","for milk","")
 .then( () => {
   app.referenceAsync("cf36f36b5ed7f84a764671c4a7ef81380e7fadcaea2014c1f0b0963bac6fae00").then((r) => {console.log("response: ",r)})
  
 })
 app.attachStorage(window.localStorage);
 app.initLocalStorage("mypass");
 console.log("Unlocked? ",app.isUnlocked());
// var addr = app.storeNewKey();
// app.storeNewKey("0x0fa27371768595");
// var addrs = app.addresses();
console.log("starting");
 app.sendToEstonianIdCode(38008030265,4000000000,"abv").then( (data) => console.log("final out: ",data)).catch( (err) => {console.log("we failed ",err)} )
 app.approveWithEstonianIdCard("ce8a7f7c35a2829c6554fd38b96a7ff43b0a76d8").then( (id) =>{
  console.log("received ID: ",id);
 });
 var cleaning = [];
 app.transfersCleanedAsync().then( (result) => { 
    console.log("transfers-el ", result);
 } ) ;

 //app.getAddressForEstonianIdCode(38008030265).then( (data) => console.log("address out: ",data))
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
