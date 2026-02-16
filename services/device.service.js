const crypto = require('crypto');
const { exec } = require('child_process');
const os = require('os');

class DeviceService {
    static async getDeviceFingerprint() {
        try {
            const machineGUID = await this.getMachineGUID();
            const diskSerial = await this.getDiskSerial();
            const macAddress = await this.getMACAddress();

            // Create hash from all components
            const fingerprint = crypto
                .createHash('sha256')
                .update(`${machineGUID}-${diskSerial}-${macAddress}`)
                .digest('hex');

            return {
                device_fingerprint: fingerprint,
                mac_address: macAddress,
                machine_info: {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    arch: os.arch()
                }
            };
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            throw error;
        }
    }

    static getMachineGUID() {
        return new Promise((resolve, reject) => {
            const command = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid';

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                const match = stdout.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
                if (match) {
                    resolve(match[1]);
                } else {
                    reject(new Error('Could not find Machine GUID'));
                }
            });
        });
    }

    static getDiskSerial() {
        return new Promise((resolve, reject) => {
            const command = 'wmic diskdrive get serialnumber';

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                const lines = stdout.split('\\n').filter(line => line.trim() && !line.includes('SerialNumber'));
                if (lines.length > 0) {
                    resolve(lines[0].trim());
                } else {
                    // Fallback to volume serial
                    exec('vol C:', (err, volStdout) => {
                        const volMatch = volStdout.match(/Serial Number is ([0-9A-F-]+)/i);
                        if (volMatch) {
                            resolve(volMatch[1]);
                        } else {
                            resolve('UNKNOWN');
                        }
                    });
                }
            });
        });
    }

    static getMACAddress() {
        const interfaces = os.networkInterfaces();
        for (const name in interfaces) {
            for (const iface of interfaces[name]) {
                // Skip internal and virtual interfaces
                if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                    return iface.mac.toUpperCase();
                }
            }
        }
        return 'UNKNOWN';
    }

    static async getCurrentIP() {
        const interfaces = os.networkInterfaces();
        let fallbackIP = null;

        for (const name in interfaces) {
            // Skip known virtual/internal interfaces
            const lowerName = name.toLowerCase();
            if (lowerName.includes('virtual') ||
                lowerName.includes('vbox') ||
                lowerName.includes('vmware') ||
                lowerName.includes('wsl') ||
                lowerName.includes('docker') ||
                lowerName.includes('tailscale') ||
                lowerName.includes('loopback')) {
                continue;
            }

            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    // Prioritize common local network patterns
                    if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
                        return iface.address;
                    }
                    // Keep the first valid non-internal IP as fallback if no 192.168 found yet
                    if (!fallbackIP) fallbackIP = iface.address;
                }
            }
        }
        return fallbackIP || '0.0.0.0';
    }
}

module.exports = DeviceService;
