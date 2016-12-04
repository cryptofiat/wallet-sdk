import { Transfer, TransferReference } from './providers/transfer-data';

// THIS FILE  IS NOT  USED DIRECTLY AT THE MOMENT BECAUSE
// IONIC WASN'T ABLE TO LOAD THE MODULE WITH TYPESCRIPT  

// RUN $> tsc Pending.ts BEFORE  COMMIT

export default class Pending {
	constructor( public storage : Storage ) { }

  public storePendingTransfer(tx : Transfer){
      let storedJson : string;
      let storedTransfers : Array<Transfer>;
      storedTransfers = this.getPendingTransfers();
      if (storedTransfers == null ) {storedTransfers = []}
      // Some checks on the object
      if (!tx.signedAmount && tx.amount) { 
          //TODO: just assuming it is inbound escrow then
          tx.signedAmount = tx.amount; 
      }
      if (tx.ref == undefined) { 
	  tx.ref = new  TransferReference();
      }
      storedTransfers.push(tx);
      storedJson = JSON.stringify(storedTransfers);
      this.storage.setItem("pendingTransfers",storedJson);
  }

  public removePendingTransfer(txHash : string){
      let storedJson : string;
      let storedTransfers : Array<Transfer>;
      storedTransfers = this.getPendingTransfers();
      if (storedTransfers == null ) {storedTransfers = []}
      storedJson = JSON.stringify(storedTransfers.filter( (tx) => tx.transactionHash != txHash ));
      this.storage.setItem("pendingTransfers",storedJson);
  }

  public getPendingTransfers() : Array<Transfer> {
      let storedTransfers : Transfer[] = [];
      let storedJson : string;
      storedJson = this.storage.getItem("pendingTransfers");
      storedTransfers = JSON.parse(storedJson);
      return storedTransfers;
  }

  public getPendingTotal() : number {
      if (this.getPendingTransfers().length == 0) return 0;
      return this.getPendingTransfers().map( (tx) => (tx.fee ? - tx.fee : 0) + tx.signedAmount).reduce((prev, curr) => prev + curr);
  }
};
