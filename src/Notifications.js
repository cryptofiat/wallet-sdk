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
            console.log("Send relationship for: " + address + " token " + token);
        });
    };
    ;
    Notifications.prototype.notifyTransfer = function (tx) {
        var _this = this;
        firebase.database().ref('/push/' + tx.targetAccount).once("value").then(function (snapshot) {
            snapshot.forEach(function (tok) {
                if (tok.val().active) {
                    // notify token tok.key
                    var notifyPost = {
                        tokens: [tok.key],
                        profile: _this.ionicConfig.profile,
                        notification: {
                            title: "You received €" + tx.amount,
                            message: "From " + tx.sourceAccount
                        }
                    };
                    console.log(notifyPost);
                    Utils.xhrPromise(_this.ionicConfig.server, JSON.stringify(notifyPost), "POST", false, _this.ionicConfig.apiKey).then(function (res) { console.log("success posting: ", res); }, function (err) { console.log("error", err); });
                    console.log('Notify token: ', tok.key);
                }
            });
        });
    };
    return Notifications;
}());
exports.__esModule = true;
exports["default"] = Notifications;
;
