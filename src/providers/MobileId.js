import * as Utils from '../Utils';

export default class MobileId {

    constructor() {
        //console.log(1324, http);

        Utils.xhrPromise('http://id.euro2.ee:8080/v1/accounts').then((data)=>console.log(data))

    }
}