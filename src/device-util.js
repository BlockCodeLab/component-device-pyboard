import MicroPythonBoard from './pyboard';
import imageBase64 from './image-base64';

export const connectDevice = async (filters, setDevice) => {
  const board = new MicroPythonBoard();
  await board.requestPort(filters);
  await board.connect();
  await board.stop();
  setDevice(board);

  // Check the device is connect state
  const checkDevice = () =>
    setTimeout(() => {
      if (board.connected) {
        checkDevice();
      } else {
        setDevice(null);
      }
    }, 1000);
  checkDevice();

  return board;
};

export const disconnectDevice = async (board, setDevice) => {
  await board.disconnect();
  setDevice(null);
};

export const showDownloadScreen = async (board, displayPackage) => {
  await board.stop();
  await board.enterRawRepl();
  // await board.execRaw(`from ${displayPackage} import display`);
  // await board.execRaw('import popui.screen.download as download_screen');
  // await board.execRaw('download_screen.render(display)');
  let line = '';
  line += 'import popui.screen.download as download_screen\n';
  line += `from ${displayPackage} import display\n`;
  line += 'download_screen.render(display)\n';
  const out = await board.execRaw(line);
  await board.exitRawRepl();
  return out;
};

export const configDevice = async (board, settings) => {
  await board.stop();
  await board.enterRawRepl();
  // await board.execRaw('import device.config as config');
  let line = 'import device.config as config\n';
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'number' && value % 1 === 0) {
      // await board.execRaw(`config.set_int("${key}", ${value})`);
      line += `config.set_int("${key}", ${value})\n`;
    } else if (typeof value === 'boolean') {
      // await board.execRaw(`config.set_bool("${key}", ${value ? 'True' : 'False'})`);
      line += `config.set_bool("${key}", ${value ? 'True' : 'False'})\n`;
    } else {
      // await board.execRaw(`config.set_str("${key}", "${value}")`);
      line += `config.set_str("${key}", "${value}")\n`;
    }
  }
  // await board.execRaw('config.save()');
  line += 'config.save()\n';
  const out = await board.execRaw(line);
  await board.exitRawRepl();
  return out;
};

export const checkFlash = async (board, files) => {
  await board.stop();
  let size = 0;
  for (const file of files) {
    size += file.content?.length ?? file.data?.length ?? 0;
  }
  await board.enterRawRepl();
  const line = `from device.flash import check_flash_free\nprint(check_flash_free(${size}))\n`;
  const output = await board.execRaw(line);
  await board.exitRawRepl();
  return output.slice(2, -3).trim() === 'True';
};

export const writeFiles = async (board, files, progress) => {
  await board.stop();

  const len = files.length;
  let finished = 0;
  const reporter = (x) => {
    progress(((finished + (1 / len) * (x / 100)) * 100).toFixed(1));
  };
  for (const file of files) {
    let { id: filePath, content } = file;
    if (file.type) {
      if (file.type === 'text/x-python' && !filePath.endsWith('.py')) {
        filePath += '.py';
      } else if (file.type.startsWith('image/') && !content) {
        content = await imageBase64(file.type, file.data);
      }
    }
    await board.put(content || '', filePath, reporter);
    finished += 1 / len;
  }
  progress(100);
};
