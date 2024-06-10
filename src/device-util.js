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
    setTimeout(async () => {
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
  await board.execRaw('display.fill(0x0000)');
  await board.execRaw('cx, cy = display.width // 2, display.height // 2');
  await board.execRaw('display.ellipse(cx, cy, 60, 60, 0xffff, True)');
  await board.execRaw('display.ellipse(cx, cy, 50, 50, 0x0000, True)');
  await board.execRaw('display.linex(cx, cy - 30, cx, cy + 30, 10, 0xffff)');
  await board.execRaw('display.linex(cx, cy + 30, cx + 15, cy + 15, 10, 0xffff)');
  await board.execRaw('display.linex(cx, cy + 30, cx - 15, cy + 15, 10, 0xffff)');
  await board.execRaw('display.render()');
  await board.exitRawRepl();
};

export const downloadDevice = async (board, files, progress) => {
  await board.stop();

  const len = files.length;
  let finished = 0;
  const reporter = (x) => {
    progress(((finished + (1 / len) * (x / 100)) * 100).toFixed(1));
  };
  for (const file of files) {
    let { id: filePath, content } = file;
    if (file.type === 'text/x-python') {
      filePath += '.py';
    } else if (file.type.startsWith('image/') && !content) {
      content = await imageBase64(file.type, file.data);
    }
    await board.put(content || '', filePath, reporter);
    finished += 1 / len;
  }
  progress(100);
  await board.reset();
};
