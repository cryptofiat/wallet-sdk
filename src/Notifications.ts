import * as firebase from "firebase";
import { Transfer, TransferReference } from './providers/transfer-data';
import * as Utils from './Utils';

// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  

// RUN $> tsc Pending.ts BEFORE  COMMIT

export default class Notifications {

public ionicConfig : any;

constructor( ) { 

  this.ionicConfig = {
    server : "https://api.ionic.io/push/notifications",
    profile : "mysecurityprofile",
    apiKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YTZhZmI4MC1lYTM5LTQxZDMtOGY1Yi0wODZiNjliMjIzNzkifQ.8PK6DiZtBS5OxPm9dbnzB62f8WJ4_l7AYpQcTOWPDGo"
  }

    // THIS IS A TEST OF FIREBASE
    if (!firebase.apps.length) { this.connectFirebase(); }


  }

  private connectFirebase() {
        let config = {
	      apiKey: "AIzaSyBudVMsbc90ESr1cUHu_FoSmCt9VllrOeI",
	      authDomain: "euro2-f4201.firebaseapp.com",
	      databaseURL: "https://euro2-f4201.firebaseio.com",
	    };
        firebase.initializeApp(config);
  };

  public registerToken(token : String, addresses : Array<String>) {

    addresses.forEach((address) => {
      firebase.database().ref('/push/' + address + '/' + token).set({active: true});
	console.log("Send relationship for: " + address +" token "+ token);
    });
   };

  public notifyTransfer(tx : Transfer) {
    firebase.database().ref('/push/' + tx.targetAccount).once("value").then( (snapshot) => {
      snapshot.forEach((tok) => {
      	if (tok.val().active) {
	// notify token tok.key
		let notifyPost = {
		tokens: [tok.key],
		profile: this.ionicConfig.profile,
		  notification: {
			title: "You received €"+tx.amount,
			message: "From "+tx.sourceAccount
		  }
	        }
		console.log(notifyPost);
		Utils.xhrPromise(this.ionicConfig.server,JSON.stringify(notifyPost),"POST",false,this.ionicConfig.apiKey).then( (res) => {console.log("success posting: ",res)}, (err) => {console.log("error",err)});
		console.log('Notify token: ', tok.key);
      	}
      });
    });

  }
};
