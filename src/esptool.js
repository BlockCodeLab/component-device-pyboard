import MD5 from 'crypto-js/md5';
import Latin1 from 'crypto-js/enc-latin1';
import { ESPLoader, Transport } from 'esptool-js';

export const connectESP32Device = async (filters) => {
  const device = await navigator.serial.requestPort({ filters });
  const esploader = new ESPLoader({
    transport: new Transport(device, true),
    baudrate: 921600,
  });

  // const chip = await esploader.main();

  // Temporarily broken
  // await esploader.flashId();

  return esploader;
};

export const disconnectESP32Device = async (esploader) => {
  await esploader.transport.disconnect();
};

export const eraseFlash = async (esploader) => {
  await esploader.eraseFlash();
};

export const writeFlash = async (esploader, files, eraseAll, progress) => {
  if (typeof eraseAll === 'function') {
    progress = eraseAll;
    eraseAll = false;
  }
  const flashOptions = {
    fileArray: files,
    flashSize: 'keep',
    eraseAll: eraseAll,
    compress: true,
    reportProgress: (fileIndex, written, total) => {
      progress(((written / total) * 100).toFixed(1));
    },
    calculateMD5Hash: (image) => MD5(Latin1.parse(image)),
  };
  await esploader.writeFlash(flashOptions);
  progress(100);
};
