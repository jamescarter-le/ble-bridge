import {Application} from './app';

import {Express} from 'express';
import * as express from 'express';

export class CentralWebInterface {

    private application: Application;
    private webApp: Express;

    constructor(application: Application) {

    }

    public start() {

       /* this.webApp.get('/', (req, res) => {

            res.send('Hello');

        });

        var port = 5000;
        this.webApp.listen(port, () => {
            console.log('CentralWebInterface started on port' + port);
        });
        */
    }

}