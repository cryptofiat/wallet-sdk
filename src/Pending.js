"use strict";
// THIS FILE  IS NOT  USED AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  
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
        return this.getPendingTransfers().map(function (tx) { return (tx.fee ? tx.fee : 0) + tx.amount; }).reduce(function (prev, curr) { return prev + curr; });
    };
    return Pending;
}());
exports.__esModule = true;
exports["default"] = Pending;
;
