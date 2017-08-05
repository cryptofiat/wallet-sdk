"use strict";
var firebase = require("firebase");
var Utils = require('./Utils');
// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  
// RUN $> tsc Pending.ts BEFORE  COMMIT
var Notifications = (function () {
    function Notifications() {
        this.ionicConfig = {
            server: "https://api.ionic.io/push/notifications",
            profile: "mysecurityprofile",
            apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YTZhZmI4MC1lYTM5LTQxZDMtOGY1Yi0wODZiNjliMjIzNzkifQ.8PK6DiZtBS5OxPm9dbnzB62f8WJ4_l7AYpQcTOWPDGo"
        };
        // THIS IS A TEST OF FIREBASE
        if (!firebase.apps.length) {
            this.connectFirebase();
        }
    }
    Notifications.prototype.connectFirebase = function () {
        var config = {
            apiKey: "AIzaSyBudVMsbc90ESr1cUHu_FoSmCt9VllrOeI",
            authDomain: "euro2-f4201.firebaseapp.com",
            databaseURL: "https://euro2-f4201.firebaseio.com"
        };
        firebase.initializeApp(config);
    };
    ;
    Notifications.prototype.registerToken = function (token, addresses) {
        addresses.forEach(function (address) {
            firebase.database().ref('/push/' + address + '/' + token).set({ active: true });
        });
    };
    ;
    Notifications.prototype.notifyTransfer = function (tx) {
        var _this = this;
        firebase.database().ref('/push/' + tx.targetAccount).once("value").then(function (snapshot) {
            var tokens = [];
            snapshot.forEach(function (tok) { tokens.push(tok.key); });
            var notifyPost = {
                tokens: tokens,
                profile: _this.ionicConfig.profile,
                notification: {
                    title: "You received €" + tx.amount / 100,
                    message: "From " + tx.counterPartyFirstName + " " + tx.counterPartyLastName,
                    payload: tx
                }
            };
            //console.log(notifyPost);
            return Utils.xhrPromise(_this.ionicConfig.server, JSON.stringify(notifyPost), "POST", false, _this.ionicConfig.apiKey);
        });
    };
    return Notifications;
}());
exports.__esModule = true;
exports["default"] = Notifications;
;
