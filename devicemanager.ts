import {Peripheral, Service, Characteristic} from 'noble';
import {DeviceWebInterface} from './devicewebinterface';

export class DeviceManager {

    private peripheral : Peripheral;
    private connected : boolean = false;
    private serviceList : Service[];
    private webInterface : DeviceWebInterface;
    private servicesCharacteristicsPromise : Promise<ServicesAndCharacteristics>;

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
        this.webInterface = new DeviceWebInterface(this);
        this.webInterface.start();
    }

    public get services() : Promise<Service[]> {
        return this.characteristicsAndServices.then(x => {
            return x.Services;
        }).catch((reason) => {
            console.log('Failed retriving characteristics: ' + reason);
        });
    }

    public get characteristics() : Promise<Characteristic[]> {
        return this.characteristicsAndServices.then(x => {
            return x.Characteristics;
        }).catch((reason) => {
            console.log('Failed retriving characteristics: ' + reason);
        });
    }

    public writeCharacteristicRequest(value: Buffer) : Promise<boolean> {
        return this.characteristics.then<boolean>(char =>

            new Promise((resolve, reject) => {

                char[4].write(value, true, (error) => {
                    if(error) {
                        reject(error);
                    } 
                    else {
                        console.log('written to characteristic');
                        resolve(true);
                    }
                })

            })

        );
    }

    private get characteristicsAndServices() : Promise<ServicesAndCharacteristics> {
        if(!this.servicesCharacteristicsPromise) {
            
            this.servicesCharacteristicsPromise =  this.connect().then((connected) => {

                return new Promise<ServicesAndCharacteristics>((resolve, reject) => {

                    this.peripheral.discoverAllServicesAndCharacteristics(
                        (error, services, characteristics) => {
                            if(error) {
                                reject(error);
                            }


                            resolve(new ServicesAndCharacteristics(services, characteristics));
                        }
                    );

                });

            });
        }
        return this.servicesCharacteristicsPromise;
    }

    private connect() : Promise<boolean> {
        if(this.connected) {
            return Promise.resolve(true);
        }

        return new Promise((resolve, reject) => {
            this.peripheral.connect((error) => {
                if(error) {
                    reject(error);
                }
                else{
                    resolve(true);
                }
            })
        });
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

class ServicesAndCharacteristics {
    public Services : Service[];
    public Characteristics : Characteristic[]

    constructor(services, characteristics) {
        this.Services = services;
        this.Characteristics = characteristics;
    }

}