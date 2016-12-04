import eth from 'ethereumjs-util';
import crypto from 'crypto';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import http from 'http';
import * as Utils from './Utils';

import MobileId from './providers/MobileId';
import Pending from './Pending';

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

	//initialise Pending
	this.pending = new Pending(storage);
        return this;
    }

    // for holding password
    attachSessionStorage(storage) {
        this._sessionStorage = storage;
        return this;
    }

    logout() {
       delete this._secret;
       this._sessionStorage.setItem("secret",null); 
    }

    getSecret() {
       if (!this._secret) { 
          this._secret = this._sessionStorage.getItem("secret"); 
       }
       return this._secret;
    }

    keys() {
        if (!this.isUnlocked()) {
            return [];
        }

        let _enckeys = JSON.parse(this._storage.getItem("keys"));
        return _enckeys.map((k) => eth.toBuffer("0x" + AES.decrypt(k, this.getSecret()).toString(Utf8)))
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

        let encryptedKey = AES.encrypt(newPriv.toString("hex"), this.getSecret());
        keysArray.push(encryptedKey.toString());
        this._storage.setItem("keys", JSON.stringify(keysArray));
        return privateToPublic(newPriv);
    }

    isUnlocked() {
        return !!(this.getSecret());
    }

    initiated() {
        if (!this._storage) throw "Storage has not been initiated.";
        return !!this._storage.getItem("encryptedChallenge");
    }

    unlock(secret) {
        if (AES.decrypt(this._storage.getItem("encryptedChallenge"), secret).toString(Utf8) == this._secretChallenge) {
            this._secret = secret;
            this._sessionStorage.setItem("secret",secret);
            return true;
        }
        return false;
    }

    initLocalStorage(secret) {
        this._secret = secret;
        this._sessionStorage.setItem("secret",secret);
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
                    //console.log("Balance of ", account.address, " is ", account.balance);
                    if (account.balance > this.getFee() + amount) {
                        return this.sendAsync(toaddr, amount, ref, account).then( (res) => {
	                   this.referenceSendAsync(res.id,this.getEstonianIdCode(),idCode,ref).then(
				() => { console.log("References submitted for ", res.id) },
			        (err) => { console.log("Reference submission failed with error: ", err) }
			   );
			   return res;
                        })
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

    findAccountAndSendToBank(toIBAN, amount, ref, recipientName) {

            return this.contractDataAsync().then((bal) => {

		//TODO: this should be able to split between  multiple  addresses
                for (var i in bal) {
		    let account = bal[i];
                    //console.log("Balance of ", account.address, " is ", account.balance);
                    if (account.balance > this.getBankFee() + amount) {
                        return this.sendToBankAsync(toIBAN, amount, ref, recipientName, account).then( (res) => {
	                   this.referenceSendAsync(res.id,this.getEstonianIdCode(),null,ref,null,toIBAN,recipientName).then(
				() => { console.log("References submitted for ", res.id) },
			        (err) => { console.log("Reference submission failed with error: ", err) }
			   );
			   return res;
                        })
                        //return true;
                    }
                }
                return ({err:"no address has enough balance to send "+amount});

            });
    }

    //TODO: JUST A TEST - TO BE REMOVED;
 
    testSignature(amount, fee, toaddr, nonce) {

	let key = eth.toBuffer("0xc33d80b3fddd6bc5d62498905b90c94cf1252ffd846def3b530acd803bbb3783");

        let shainput = "0x";

	shainput = shainput.concat(
            this.uint256Hex(nonce),
            toaddr,
            this.uint256Hex(amount),
            this.uint256Hex(fee)
        );

	console.log("Hash in 16: ", shainput.toString('hex') );

        let sha = eth.sha3(shainput);

	console.log("Hash: ", sha);
	console.log("Hash in 16: ", sha.toString('hex') );

        // create a signed transfer
        let ec2 = eth.ecsign(sha, key);

        var postData = {
            "amount": amount,
            "fee": fee,
            "nonce": nonce,
            "targetAccount": "0x" + toaddr,
            "signature": eth.bufferToHex(ec2.r).slice(2)
            + eth.bufferToHex(ec2.s).slice(2) + ec2.v.toString(16)
        };
        console.log("postData: ", postData);
     };


    //TODO: this should be structured better with sendAsync()
    sendToBankAsync(toIBAN, amount, ref, recipientName, _data) {

        let nonce = _data.nonce + 1;
        let fee = this.getBankFee();
	let toaddr = this.getBankProxyAddress();

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

        var postData = {
            "amount": amount,
            "fee": fee,
            "nonce": nonce,
            "reference": ref,
            "recipientName": recipientName,
            "sourceAccount": _data.address,
            "targetAccount": "0x" + toaddr,
            "targetBankAccountIBAN": toIBAN,
            "signature": eth.bufferToHex(ec2.r).slice(2)
            + eth.bufferToHex(ec2.s).slice(2) + ec2.v.toString(16)
        };
        console.log("postData: ", postData);

        return Utils.xhrPromise(this.WALLET_SERVER + "transfers/bank", JSON.stringify(postData), "POST").then((response) => {
	    return JSON.parse(response);
        });
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
	    //TODO: the wallet-server should take the signature hex with 0x
            "signature": eth.bufferToHex(ec2.r).slice(2)
            + eth.bufferToHex(ec2.s).slice(2) + ec2.v.toString(16)
        };
        console.log("postData: ", postData);
        //console.log(JSON.stringify(postData));

        return Utils.xhrPromise(this.WALLET_SERVER + "transfers", JSON.stringify(postData), "POST").then((response) => {
	    return JSON.parse(response);
        });

    }


    getFee() {

        //TODO: get from wallet.euro2.ee
        // var promise = Utils.xhrPromise(this.WALLET_SERVER+"fees");
        // return promise

        return 1;
    }

    getBankFee() {

        return 5;
    }

    getBankProxyAddress() {
	//TODO: read from wallet server
        // wallet-server return "8664e7a68809238d8f8e78e4b7c723282533a787";
        return "833898875a12a3d61ef18dc3d2b475c7ca3a4a72";
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
		    fee: parsedResponse.fee,
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
             return this.referenceAsync(tx.transactionHash).then( (ref) => {
		 tx.ref = ref;
		 tx.counterPartyIdCode = (tx.signedAmount < 0) ? ref.receiverIdCode : ref.senderIdCode;
		 if (!tx.counterPartyIdCode) { return tx; }
                 return this.nameFromIdAsync(tx.counterPartyIdCode).then( (names) => {
		     if (names.idCode) {
			 tx.counterPartyFirstName = names.firstName;
			 tx.counterPartyLastName = names.lastName;
		     }
		     return tx;
	         }, (err) => {return tx;} );
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
		    this.escrowToPending(res.escrowTransfers);
                    return { ownerId: res.ownerId, transactionHash: res.transactionHash };
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

    escrowToPending(escrowArray) {
        if (escrowArray && escrowArray.length > 0) {
		//expecting array {amount, transactionHash, timestamp}
		// put to pending array
		escrowArray.map((escrow) => {
		    this.pending.storePendingTransfer(escrow);
		});
	}
    }

    approveWithEstonianIdCard(address) {

        return Utils.xhrPromise(this.ID_SERVER_HTTPS + 'authorisations/idCards', JSON.stringify({
            accountAddress: address,
	    phoneNumber: "000000"
        }), 'POST', true).then((res) => {
            res = JSON.parse(res);
            switch (res.authenticationStatus) {
                case 'LOGIN_SUCCESS':
		    this.escrowToPending(res.escrowTransfers);
                    return { ownerId: res.ownerId, transactionHash: res.transactionHash };
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

    //TODO: maybe there should be different methods for Bank and Eth transfers
    referenceSendAsync(transactionHash,senderIdCode,receiverIdCode,referenceText,referenceCode,receiverIBAN,recipientName,attachments) {
        let postRef = {};
	postRef.senderIdCode = senderIdCode;
	postRef.receiverIdCode = receiverIdCode;
	postRef.receiverIBAN = receiverIBAN;
	postRef.recipientName = recipientName;
	postRef.referenceText = referenceText;
	postRef.referenceCode = referenceCode;
        return Utils.xhrPromise(this.REF_SERVER + stripHexPrefix(transactionHash), JSON.stringify(postRef), "POST").then((response) => {
            return true; 
        });
    }

    referenceAsync(transactionHash) {
        return Utils.xhrPromise(this.REF_SERVER + stripHexPrefix(transactionHash)).then((response) => {
            return JSON.parse(response)
        }, (err) => { console.log("No  reference for ",transactionHash); return {}; } );
    }

    nameFromIdAsync(idCode) {
        return Utils.xhrPromise(this.ID_SERVER + "/ldap/" + idCode).then((response) => {
            return JSON.parse(response)
        }, (err) => { console.log("Not valid id code ",idCode); return {}; } );
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
 app.attachStorage(window.localStorage);
 app.testSignature(3,0,"65fa6548764c08c0dd77495b33ed302d0c212691",1)
 app.initLocalStorage("mypass");
 console.log("Unlocked? ",app.isUnlocked());
// var addr = app.storeNewKey();
// app.storeNewKey("0x0fa27371768595");
// var addrs = app.addresses();
console.log("starting");
 app.findAccountAndSendToBank("EE110232000123",4,"abv").then( (data) => console.log("final out: ",data)).catch( (err) => {console.log("we failed ",err)} )
 app.approveWithEstonianIdCard("ce8a7f7c35a2829c6554fd38b96a7ff43b0a76d8").then( (id) =>{
  console.log("received ID: ",id);
 });
 app.referenceSendAsync("cf36f36b5ed7f84a764671c4a7ef81380e7fadcaea2014c1f0b0963bac6fae00","38008030265","48308260321","for milk","")
 .then( () => {
   app.referenceAsync("cf36f36b5ed7f84a764671c4a7ef81380e7fadcaea2014c1f0b0963bac6fae00").then((r) => {console.log("response: ",r)})
  
 })
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
