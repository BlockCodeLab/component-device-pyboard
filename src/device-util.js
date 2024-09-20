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
  await board.execRaw(`from ${displayPackage} import display`);
  await board.execRaw('import popui.download_screen as download_screen');
  await board.execRaw('download_screen.render(display)');
  await board.exitRawRepl();
};

export const configDevice = async (board, settings) => {
  await board.stop();
  await board.enterRawRepl();
  await board.execRaw('import device.config as config');
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'number' && value % 1 === 0) {
      await board.execRaw(`config.set_int("${key}", ${value})`);
    } else if (typeof value === 'boolean') {
      await board.execRaw(`config.set_bool("${key}", ${value ? 'True' : 'False'})`);
    } else {
      await board.execRaw(`config.set_str("${key}", "${value}")`);
    }
  }
  await board.execRaw('config.save()');
  await board.exitRawRepl();
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
