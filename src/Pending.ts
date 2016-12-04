import { Transfer, TransferReference } from './providers/transfer-data';

export default class Pending {
	constructor( public storage : Storage ) { }
	public hello( world  : string) : string {
		return "hello " + world + this.storage.getItem("junk");;
	};
  // Penging Transfers <<= this part should move to wallet-sdk

  public storePendingTransfer(tx : Transfer){
      let storedJson : string;
      let storedTransfers : Array<Transfer>;
      storedTransfers = this.getPendingTransfers();
      if (storedTransfers == null ) {storedTransfers = []}
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
      return this.getPendingTransfers().map( (tx) => (tx.fee ? tx.fee : 0) + tx.amount).reduce((prev, curr) => prev + curr);
  }
  // END Pending TX
};
