import eth from 'ethereumjs-util';
import crypto from 'crypto';

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


/*let privateKey = _generatePrivate();
 let publicKey = _privateToPublic(privateKey);
 let addr = _pubToAddress(publicKey);

 document.querySelector('body').innerHTML = addr.toString("hex");*/
