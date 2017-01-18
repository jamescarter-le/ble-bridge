import {DeviceManager} from './devicemanager';

import {Express} from 'express';
import * as express from 'express';

import {Server} from 'node-ssdp';

export class DeviceWebInterface {

    device: DeviceManager;
    app: Express;
    ssdp: Server;
    
    constructor(device: DeviceManager) {
        this.device = device;
    }

    public start() : void {
        this.startExpress();
        this.startSsdp();
    }

    private startExpress() : void {
        this.app = express();

        this.setupRootHandler();
        this.setupUniversalPlugAndPlayHandler();
        this.setupWriteCharacteristicRequestHandler();
        this.setupReadCharacteristicRequestHandler();

        var port = this.calculatePort();
        this.app.listen(port, () => {
            console.log('DeviceWebInterface started for ' + this.device.name + ' ' + this.device.address + ' on ' + port);
        });
    }

    private get UniqueDeviceName() {
        return 'uuid:' + this.device.address.replace(/:/g, '');
    }

    private startSsdp() : void {
        this.ssdp = new Server({
            udn: this.UniqueDeviceName,
            location: 'http://192.168.0.25:' + this.calculatePort() + '/desc.html'
        });

       this.ssdp.addUSN('urn:schemas-upnp-org:device:BlePeripheral:1');
       this.ssdp.start('0.0.0.0');
       console.log('ssdp started');
    }

    private calculatePort() : number {

        // Take the last 3 hex characters from the address, and add 5000 to make the port for this service.
        var basePort = 5000;
        var devicePort = parseInt(this.device.address.replace(/:/g, '').substr(9, 3), 16);
        var appPort = basePort + devicePort;

        return appPort;
    }

    private setupReadCharacteristicRequestHandler() {
        this.app.get('/read-char', (req, res) => {

            var handle = 0x00;

            this.device.readCharacteristicRequest(handle).then((buffer) => {
                res.send({
                    value: buffer
                })
            }).catch((error) => {
                res.send({
                });
            });

        });
    }

    private setupWriteCharacteristicRequestHandler() {
        this.app.get('/char-write-req', (req, res) => {
            console.log('/char-write-req requested');

            var val = parseInt(req.query['value']);
            var arr = new Uint8Array([val]);
            var buffer = new Buffer(arr);

            this.device.writeCharacteristicRequest(buffer).then((done) => {
                res.send({
                    done: done,
                    value: req.query['value']
                });
            });
        })
    }

    private setupRootHandler() : void {
        this.app.get('/', (req, res) => {

            console.log('/ requested');

            var output = {
                name: this.device.name,
                address: this.device.address,
                addressType: this.device.addressType,
                connectable: this.device.connectable,
                state: this.device.state,
                services: null,
                characteristics: null
            };

            var promises = [];

            promises.push(
                this.device.services.then((services) => {
                    output.services = services.map(service => {
                            return {
                                uuid: service.uuid,
                                type: service.type,
                                name: service.name
                            };
                    });
                })
                .catch((reason) => {
                    output.services = 'Cannot get services as we are not connected.';
                })
            );

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
    }

    private setupUniversalPlugAndPlayHandler() : void {
        this.app.get('/desc.html', (req, res) => {
            console.log('req');
            res.type('text/xml');
            this.device.services.then(services => {
                var serviceUuid = services[services.length - 1].uuid;
                res.send(`<?xml version="1.0"?>
<root xmlns="urn:schemas-upnp-org:device-1-0">
<specVersion>
    <major>1</major>
    <minor>0</minor>
</specVersion>

<device>
    <deviceType>urn:schemas-upnp-org:device:BlePeripheral:1</deviceType>
    <friendlyName>` + this.device.name + `</friendlyName>
    <manufacturer>` + this.device.name + `</manufacturer>
    <modelDescription>` + this.device.name + `</modelDescription>
    <modelName>` + this.device.name + `</modelName>
    <UDN>` + this.UniqueDeviceName + `</UDN> 

</device>
</root>
            `);
            });
            
        });
    }

}