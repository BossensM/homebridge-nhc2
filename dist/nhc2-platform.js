"use strict";
const NHC2_1 = require("@homebridge-nhc2/nhc2-hobby-api/lib/NHC2");
const nhc2_logger_1 = require("./nhc2-logger");
const PLUGIN_NAME = "homebridge-nhc2";
const PLATFORM_NAME = "NHC2";
const INCOMPATIBLE_TYPES = ["audiocontrol"];
let hap;
let Accessory;
class NHC2Platform {
    constructor(logger, config, api) {
        this.logger = logger;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap
            .Characteristic;
        this.accessories = [];
        this.suppressedAccessories = [];
        this.processEvent = (event) => {
            if (!!event.Params) {
                event.Params.flatMap(param => param.Devices.forEach((device) => {
                    const deviceAccessoryForEvent = this.findAccessoryDevice(device);
                    if (!!deviceAccessoryForEvent) {
                        deviceAccessoryForEvent.services.forEach(service => this.processDeviceProperties(device, service));
                    }
                }));
            }
        };
        this.addStatusChangeCharacteristic = (newService, newAccessory) => {
            newService
                .getCharacteristic(this.Characteristic.On)
                .on("set" /* SET */, (value, callback) => {
                this.nhc2.sendStatusChangeCommand(newAccessory.UUID, value);
                callback();
            });
        };
        this.addBrightnessChangeCharacteristic = (newService, newAccessory) => {
            newService
                .getCharacteristic(this.Characteristic.Brightness)
                .on("set" /* SET */, (value, callback) => {
                this.nhc2.sendBrightnessChangeCommand(newAccessory.UUID, value);
                callback();
            });
        };
        this.addTriggerCharacteristic = (newService, newAccessory) => {
            newService
                .getCharacteristic(this.Characteristic.On)
                .on("set" /* SET */, (value, callback) => {
                this.nhc2.sendTriggerBasicStateCommand(newAccessory.UUID);
                callback();
            });
        };
        this.log = new nhc2_logger_1.NHC2Logger(logger, config);
        this.suppressedAccessories = config.suppressedAccessories || [];
        if (this.suppressedAccessories) {
            this.log.info("Suppressing accessories: ");
            this.suppressedAccessories.forEach(acc => {
                this.log.info("  - " + acc);
            });
        }
        this.nhc2 = new NHC2_1.NHC2("mqtts://" + config.host, {
            port: config.port || 8884,
            clientId: config.clientId || "NHC2-homebridge",
            username: config.username || "hobby",
            password: config.password,
            rejectUnauthorized: false,
        });
        this.log.info("NHC2Platform finished initializing!");
        api.on("didFinishLaunching" /* DID_FINISH_LAUNCHING */, async () => {
            this.log.info("NHC2Platform 'didFinishLaunching'");
            await this.nhc2.subscribe();
            const nhc2Accessories = await this.nhc2.getAccessories();
            this.log.verbose("got " + nhc2Accessories.length + " accessories");
            this.addAccessories(nhc2Accessories);
            this.nhc2.getEvents().subscribe(event => {
                this.processEvent(event);
            });
        });
    }
    configureAccessory(accessory) {
        this.accessories.push(accessory);
    }
    findAccessoryDevice(device) {
        return this.accessories.find(accessory => accessory.UUID === device.Uuid);
    }
    addAccessories(accessories) {
        const mapping = {
            light: {
                service: this.Service.Lightbulb,
                handlers: [this.addStatusChangeCharacteristic],
            },
            dimmer: {
                service: this.Service.Lightbulb,
                handlers: [
                    this.addStatusChangeCharacteristic,
                    this.addBrightnessChangeCharacteristic,
                ],
            },
            socket: {
                service: this.Service.Outlet,
                handlers: [this.addStatusChangeCharacteristic],
            },
            generic: {
                service: this.Service.Switch,
                handlers: [this.addTriggerCharacteristic],
            },
            "switched-generic": {
                service: this.Service.Switch,
                handlers: [this.addTriggerCharacteristic],
            },
        };
        Object.keys(mapping).forEach(model => {
            const config = mapping[model];
            const accs = accessories.filter(acc => !this.suppressedAccessories.includes(acc.Uuid) &&
                acc.Model === model &&
                !INCOMPATIBLE_TYPES.includes(acc.Type || ""));
            accs.forEach(acc => {
                const newAccessory = new Accessory(acc.Name, acc.Uuid);
                const newService = new config.service(acc.Name);
                config.handlers.forEach((handler) => {
                    handler(newService, newAccessory);
                });
                newAccessory.addService(newService);
                this.processDeviceProperties(acc, newService);
                this.registerAccessory(newAccessory);
            });
        });
    }
    registerAccessory(accessory) {
        const existingAccessory = this.findExistingAccessory(accessory);
        if (!!existingAccessory) {
            this.unregisterAccessory(existingAccessory);
        }
        this.accessories.push(accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
            accessory,
        ]);
        this.log.debug("registered accessory: " +
            accessory.displayName +
            " (" +
            accessory.UUID +
            ")");
    }
    unregisterAccessory(accessory) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
            accessory,
        ]);
        this.accessories.splice(this.accessories.indexOf(accessory), 1);
        this.log.debug("unregistered accessory: " +
            accessory.displayName +
            " (" +
            accessory.UUID +
            ")");
    }
    findExistingAccessory(newAccessory) {
        return this.accessories
            .filter(accessory => accessory.UUID === newAccessory.UUID)
            .find(() => true);
    }
    processDeviceProperties(device, service) {
        if (!!device.Properties) {
            device.Properties.forEach(property => {
                if (property.Status === "On" || property.BasicState === "On") {
                    service.getCharacteristic(this.Characteristic.On).updateValue(true);
                }
                if (property.Status === "Off" || property.BasicState === "Off") {
                    service.getCharacteristic(this.Characteristic.On).updateValue(false);
                }
                if (!!property.Brightness) {
                    service
                        .getCharacteristic(this.Characteristic.Brightness)
                        .updateValue(property.Brightness);
                }
            });
        }
    }
}
module.exports = (api) => {
    hap = api.hap;
    Accessory = api.platformAccessory;
    api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, NHC2Platform);
};
//# sourceMappingURL=nhc2-platform.js.map