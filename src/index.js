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

/*mock*/
export function balanceMock() {
    return 123.45;
}

export function identityCodeMock() {
    return 38008030123;
}

/*let privateKey = _generatePrivate();
 let publicKey = _privateToPublic(privateKey);
 let addr = _pubToAddress(publicKey);

 document.querySelector('body').innerHTML = addr.toString("hex");*/
