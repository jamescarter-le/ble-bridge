import * as noble from 'noble';
import {Peripheral} from 'noble';

import {DeviceManager} from './devicemanager';
import {CentralWebInterface} from './centralwebinterface';

export class Application {
    private poweredOnPromise: Promise<boolean>;

    private centralWebInterface: CentralWebInterface;
    private devices: DeviceManager[] = [];

    public get knownDevices() {
        return this.devices;
    }

    public constructor() {
        this.centralWebInterface = new CentralWebInterface(this);
        this.initNoble();
    }

    public start() : void {
        this.poweredOnPromise.then(() => {

            noble.startScanning();

        }).catch((reason) => {
            throw new Error('Cannot start: ' + reason);
        });
    }

    private initNoble() : void {
        this.poweredOnPromise = new Promise((resolve, reject) => {
            noble.on('stateChange', (state) => { 
                if(state == 'poweredOn')
                    resolve(true);
                else if(state == 'poweredOff') 
                    reject('poweredOff');

                this.onStateChange(state); 
            } );
        });
        noble.on('discover', (peripheral) => this.onDiscover(peripheral));
    }

    private onStateChange(state: string) : void {
        console.log('noble: State: ' + state);
    }

    private onDiscover(peripheral: Peripheral) : void {
        console.log('noble: Advertisment: ' + peripheral.advertisement.localName);

        if(peripheral.advertisement.localName == 'SmartBlind') {
            this.addDevice(peripheral);
        }
    }

    private addDevice(peripheral: Peripheral) : void {
        console.log('Adding Device: ' + peripheral.advertisement.localName + ' -- ' + peripheral.address);
        
        var device = new DeviceManager(peripheral);
        device.start();

        this.devices.push(device);
    }
}