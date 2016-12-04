"use strict";
var transfer_data_1 = require('./providers/transfer-data');
// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  
// RUN $> tsc Pending.ts BEFORE  COMMIT
var Pending = (function () {
    function Pending(storage) {
        this.storage = storage;
    }
    Pending.prototype.storePendingTransfer = function (tx) {
        var storedJson;
        var storedTransfers;
        storedTransfers = this.getPendingTransfers();
        if (storedTransfers == null) {
            storedTransfers = [];
        }
        // Some checks on the object
        if (!tx.signedAmount && tx.amount) {
            //TODO: just assuming it is inbound escrow then
            tx.signedAmount = tx.amount;
        }
        if (tx.ref == undefined) {
            tx.ref = new transfer_data_1.TransferReference();
        }
        storedTransfers.push(tx);
        storedJson = JSON.stringify(storedTransfers);
        this.storage.setItem("pendingTransfers", storedJson);
    };
    Pending.prototype.removePendingTransfer = function (txHash) {
        var storedJson;
        var storedTransfers;
        storedTransfers = this.getPendingTransfers();
        if (storedTransfers == null) {
            storedTransfers = [];
        }
        storedJson = JSON.stringify(storedTransfers.filter(function (tx) { return tx.transactionHash != txHash; }));
        this.storage.setItem("pendingTransfers", storedJson);
    };
    Pending.prototype.getPendingTransfers = function () {
        var storedTransfers = [];
        var storedJson;
        storedJson = this.storage.getItem("pendingTransfers");
        storedTransfers = JSON.parse(storedJson);
        return storedTransfers;
    };
    Pending.prototype.getPendingTotal = function () {
        if (this.getPendingTransfers().length == 0)
            return 0;
        return this.getPendingTransfers().map(function (tx) { return (tx.fee ? -tx.fee : 0) + tx.signedAmount; }).reduce(function (prev, curr) { return prev + curr; });
    };
    return Pending;
}());
exports.__esModule = true;
exports["default"] = Pending;
;
