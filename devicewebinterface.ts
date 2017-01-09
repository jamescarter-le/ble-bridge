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
        this.app = express();

        this.app.get('/desc.html', (req, res) => {
            console.log('req');
            res.type('text/xml');
            this.device.services.then(services => {
                var serviceUuid = services[services.length - 1].uuid;
//this.device.address
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
    <UDN>uuid:` + 'HELLO123456' + `</UDN> 

</device>
</root>
            `);
            });

            
            
        });

        this.app.get('/char-write-req', (req, res) => {
            console.log('/char-write-req requested');

            var val = Number.parseInt(req.query['value']);
            console.log(val);

            this.device.characteristics.then(char => {
                console.log('writing');
                var arr = new Uint8Array([val]);
                var buffer = new Buffer(arr);
                console.log(buffer);
                char[4].write(buffer, true, (error) => {
                    console.log(error);
                    console.log('written');
                    res.send('done');
                })
            }).catch((reason) => {
                res.send('failed: ' + reason);
            });
        })

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

        var port = this.calculatePort();
        this.app.listen(port, () => {
            console.log('DeviceWebInterface started for ' + this.device.name + ' ' + this.device.address + ' on ' + port);
        });

        
        this.ssdp = new Server({
            udn: 'uuid:HELLO123456',// + this.device.address,
            location: 'http://192.168.0.25:' + port + '/desc.html'
        });

        this.device.services.then((services) => {
            var uuid = services[services.length - 1].uuid;
            this.ssdp.addUSN('urn:schemas-upnp-org:device:BlePeripheral:1');

            this.ssdp.start('0.0.0.0');

            console.log('ssdp started');
        }).catch((reason) => {
            console.log('Could not start SSDP: '+ reason);
        })
    }

    private calculatePort() : number {

        // Take the last 3 hex characters from the address, and add 5000 to make the port for this service.
        var basePort = 5000;
        var devicePort = parseInt(this.device.address.substr(this.device.address.length - 2, 2), 16);
        var appPort = basePort + devicePort;

        return appPort;
    }

}