import * as eth from 'ethereumjs-util';
import { AES, enc } from 'crypto-js';

// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  

// RUN $> tsc Backup.ts BEFORE  COMMIT

export class KeyBackup {
	constructor( plainkey : ArrayBuffer, password : string ) { 
		if (plainkey && password) {
			this.address = eth.bufferToHex(eth.pubToAddress(eth.privateToPublic(plainkey)));
			this.keyEnc = AES.encrypt(plainkey.toString('base64'),password).toString();
		}
	};
	public address : string;
	public keyEnc : string;
	public active : boolean = true;

	public toPlainkey( password : string ) : ArrayBuffer {
		if (!this.keyEnc) { return null; }
		return Buffer.from(AES.decrypt(this.keyEnc, password).toString(enc.Utf8),'base64');
	}
}
