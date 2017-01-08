import {Peripheral, Service, Characteristic} from 'noble';
import {Express} from 'express';
import * as express from 'express';

export class DeviceManager {

    private peripheral : Peripheral;
    private connected : boolean = false;
    private serviceList : Service[];
    private webInterface : DeviceWebInterface;
    private characteristicsPromise : Promise<Characteristic[]>;

    public get name() { return this.peripheral.advertisement.localName; }
    public get address() { return this.peripheral.address; }
    public get addressType() { return this.peripheral.addressType; }
    public get state() { return this.peripheral.state; }
    public get connectable() { return this.peripheral.connectable; }
    public get services() { return this.peripheral.services; }

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

/*
        this.peripheral.connect((error) => {
            if(error != null) {
                console.warn(this.deviceDescription + ' : Could not connect.')
                console.warn(error);
            }

           
        });
        */
    }

    public get characteristics() : Promise<Characteristic[]> {
        if(!this.characteristicsPromise) {
            this.characteristicsPromise = new Promise((resolve, reject) => {

                if(!this.connected) {
                    reject('Not connected');
                    return;
                }

                this.peripheral.discoverAllServicesAndCharacteristics(
                    (error, services, characteristics) => {
                        if(error) {
                            reject(error);
                        }

                        resolve(characteristics);
                    }
                );
            });
        }
        return this.characteristicsPromise;
    }

    private onConnect() : void {
        this.connected = true;
        console.log(this.deviceDescription + " : Connected");
    }

    private onDisconnect() : void {
        this.connected = false;
        console.log(this.deviceDescription + " : Disconnected");
    }

    private onRssiUpdate(rssi: number) : void {
        console.log(this.deviceDescription + " : rssi");
        console.log(rssi);
    }

    private onServicesDiscover(services: Service[]) : void {
        this.serviceList = services;
        /*
        console.log(this.deviceDescription + " : services");
        services.forEach(service  => {
            console.log('Service');
            console.log(service.uuid + ' ' + service.name);
            if(service.characteristics) {
                console.log('Characteristics');
                service.characteristics.forEach(char => {
                    console.log(char.name + ' ' + char.uuid);
                });
            }
        });
        */
    }

    private get deviceDescription() {
        return 'device: ' + this.peripheral.advertisement.localName + ' -- ' + this.peripheral.address;
    }
}

class DeviceWebInterface {

    device: DeviceManager;
    app: Express;
    
    constructor(device: DeviceManager) {
        this.device = device;
    }

    public start() : void {

        this.app = express();
        this.app.get('/', (req, res) => {

            var output = {
                name: this.device.name,
                address: this.device.address,
                addressType: this.device.addressType,
                connectable: this.device.connectable,
                state: this.device.state,
                services: null,
                characteristics: null
            };

            if(this.device.services) 
            {
                output.services = this.device.services.map(service => {
                    return {
                        uuid: service.uuid,
                        type: service.type,
                        name: service.name
                    }
                })
            }
            else {
                output.services = 'Not yet retrived';
            }

            var promises = [];

            promises.push(
                this.device.characteristics.then((chars) => {
                    output.characteristics = chars.map(char => {
                            return {
                                uuid: char.uuid,
                                name: char.name,
                                type: char.type,
                            };
                    });
                })
                .catch((reason) => {
                    output.characteristics = 'Cannot get characteristics as we are not connected.';
                })
            );

            Promise.all(promises).then(() => {
                res.send(output)
            });
        });

        var port = this.calculatePort();
        console.log(port);
        this.app.listen(port, () => {
            console.log('DeviceWebInterface started for ' + this.device.name + ' ' + this.device.address);
            console.log('Port ' + port);
        });
    }

    private calculatePort() : number {

        // Take the last 3 hex characters from the address, and add 5000 to make the port for this service.
        var basePort = 5000;
        var devicePort = parseInt(this.device.address.substr(this.device.address.length - 2, 2), 16);
        var appPort = basePort + devicePort;

        return appPort;
    }

}