import * as Utils from './Utils';
import { AES, enc } from 'crypto-js';
import * as crypto from 'crypto';
import { KeyBackup } from './providers/keybackup';

// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  

// RUN $> tsc Backup.ts BEFORE  COMMIT

export default class Backup {
	constructor( public storage : Storage ) { };
	public password : string;
	public challenge : string;
    public BACKUP_SERVER : string = "https://account-identity.euro2.ee/v1/backup/";

	public setFirstPassword(password: string, idCode : string) : Promise<boolean> {
		// server takes  plaintext  in base64, but the encrypt funciton takes raw bytes 
		var _plaintext_64 = crypto.randomBytes(24).toString('base64');
		var _plaintext = window.atob(_plaintext_64);
		let postData : { idCode : string, active : boolean, plaintext : string, newEncrypted : string } = {
			idCode : idCode,
			active : true,
			plaintext : _plaintext_64,
			newEncrypted : AES.encrypt(_plaintext,password).toString()
		};
		//console.log("setting pwd: ",JSON.stringify(postData));
		return Utils.xhrPromise(this.BACKUP_SERVER+"challenge",JSON.stringify(postData),"PUT").then(
			() => { return true}, 
			() => { return false}
		);
	}
	public verifyPassword(password: string, idCode : string) : Promise<boolean> {
		// check if pwd is correct
		return this.hasBackup(idCode).then( (encrypted : string) => {
			let postData : { plaintext? : string, encrypted ?: string } = {
				encrypted : encrypted,
				plaintext : window.btoa(AES.decrypt(encrypted,password).toString(enc.Utf8))
			};
			return Utils.xhrPromise(this.BACKUP_SERVER+"challenge",JSON.stringify(postData),"POST").then(
				(json) => {
					let jsonParsed : { plaintext? : string, encrypted? : string} = JSON.parse(json);
					this.password = password;
					this.challenge = jsonParsed.plaintext;
					return true;
				}, (err) => { console.log("error: ",err); return false;}
			);
		}, () => {return false});
	};

	public hasBackup(idCode : string) : Promise<string> {
		return Utils.xhrPromise(this.BACKUP_SERVER+"challenge?idCode="+idCode,null,"GET").then(
			(json) => {
				let jsonParsed : { plaintext? : string, encrypted? : string} = JSON.parse(json);
				return jsonParsed.encrypted;
			}, () => {return null; }
		);
	};

	public syncKeys( _keys : KeyBackup[]) : Promise<KeyBackup[]> {
		if (!this.challenge) { return null; }
		let postData : { challenge : string, keys : KeyBackup[] } = {
			challenge : this.challenge,
			keys : _keys
		};
		return Utils.xhrPromise(this.BACKUP_SERVER+"keys",JSON.stringify(postData),"POST").then(
			(json) => {
				let jsonParsed : { challenge? : string, keys? : KeyBackup[] } = JSON.parse(json);
				//console.log("returned keys: ", jsonParsed.keys);
				return jsonParsed.keys;
			}, (err) => {console.log("Error syncing keys",err); return null;}
		);
	}

};
