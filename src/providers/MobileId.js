import * as Utils from '../Utils';

export default class MobileId {

    constructor() {
        //console.log(1324, http);

        Utils.xhr('http://www.google.com',null, ()=>{
            console.log(arguments);
        });



    }
}