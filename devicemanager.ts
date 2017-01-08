import {Peripheral, Service, Characteristic} from 'noble';
import {DeviceWebInterface} from './devicewebinterface';

export class DeviceManager {

    private peripheral : Peripheral;
    private connected : boolean = false;
    private serviceList : Service[];
    private webInterface : DeviceWebInterface;
    private servicesCharacteristicsPromise : Promise<{}>;

    public get name() { return this.peripheral.advertisement.localName; }
    public get address() { return this.peripheral.address; }
    public get addressType() { return this.peripheral.addressType; }
    public get state() { return this.peripheral.state; }
    public get connectable() { return this.peripheral.connectable; }

    constructor(peripheral: Peripheral) {
        this.peripheral = peripheral;

        this.peripheral.on('connect', () => this.onConnect());
        this.peripheral.on('disconnect', () => this.onDisconnect());
        this.peripheral.on('rssiUpdate', (x) => this.onRssiUpdate(x));
        this.peripheral.on('servicesDiscover', (x) => this.onServicesDiscover(x));
    }

    public start() : void {
         this.peripheral.connect((error) => {
            if(error != null) {
                console.warn(this.deviceDescription + ' : Could not connect.')
                console.warn(error);
                return;
            }

            this.connected = true;
            this.webInterface = new DeviceWebInterface(this);
            this.webInterface.start();
        });
    }

    public get services() : Promise<Service[]> {
        return this.characteristicsAndServices.then(x => {
            return (<any>x).services;
        }).catch((reason) => {
            console.log('Failed retriving characteristics: ' + reason);
        });
    }

    public get characteristics() : Promise<Characteristic[]> {
        return this.characteristicsAndServices.then(x => {
            return (<any>x).characteristics;
        }).catch((reason) => {
            console.log('Failed retriving characteristics: ' + reason);
        });
    }

    private get characteristicsAndServices() : Promise<{}> {
        if(!this.servicesCharacteristicsPromise) {
            this.servicesCharacteristicsPromise = new Promise((resolve, reject) => {

                if(!this.connected) {
                    reject('Not connected');
                    return;
                }

                this.peripheral.discoverAllServicesAndCharacteristics(
                    (error, services, characteristics) => {
                        if(error) {
                            reject(error);
                        }

                        resolve({services, characteristics});
                    }
                );
            });
        }
        return this.servicesCharacteristicsPromise;
    }

    private onConnect() : void {
        this.connected = true;
        console.log(this.deviceDescription + " : Connected");
    }

    private onDisconnect() : void {
        this.connected = false;
        this.peripheral.connect();
        console.log(this.deviceDescription + " : Disconnected");
    }

    private onRssiUpdate(rssi: number) : void {
        console.log(this.deviceDescription + " : rssi");
        console.log(rssi);
    }

    private onServicesDiscover(services: Service[]) : void {
        this.serviceList = services;
    }

    private get deviceDescription() {
        return 'device: ' + this.peripheral.advertisement.localName + ' -- ' + this.peripheral.address;
    }
}