import eth from 'ethereumjs-util';
import crypto from 'crypto';

let _generatePrivate = () => {
    let buf;
    do buf = crypto.randomBytes(32); while (!eth.isValidPrivate(buf));
    return buf;
};

let _privateToPublic = (privateKey) => {
    return eth.privateToPublic(privateKey)
};

let _pubToAddress = (publicKey) =>{
    return eth.pubToAddress(publicKey)
};

/*mock*/
let _balanceMock = () => {
    return 123.45;
}

let _identityCodeMock = () => {
    return 38008030123;
}

module.exports = {
    balance: _balanceMock,
    identityCode: _identityCodeMock,
    generatePrivate: _generatePrivate,
    privateToPublic: _privateToPublic,
    pubToAddress: _pubToAddress
};

/*let privateKey = _generatePrivate();
let publicKey = _privateToPublic(privateKey);
let addr = _pubToAddress(publicKey);

document.querySelector('body').innerHTML = addr.toString("hex");*/
let bal = _balanceMock().toString();
document.querySelector('body').innerHTML = bal; 
