
import mysql from "mysql";


//only for testing
const config = {

    host:"localhost",
    user:"root",
    password:"root"

};


export class DBManager {

    constructor() {
        this.conn = null;
    }



    init() {

        this.conn = mysql.createConnection(config)


    }


    create() {



    }


    /**
     * give back last price entry
     */
    readLast() {



    }





}
