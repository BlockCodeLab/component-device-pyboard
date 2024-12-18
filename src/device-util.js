import MicroPythonBoard from './pyboard';
import imageBase64 from './image-base64';

export const connectDevice = async (filters) => {
  const board = new MicroPythonBoard();
  await board.requestPort(filters);
  await board.connect();
  return board;
};

export const disconnectDevice = async (board) => {
  await board?.disconnect();
};

export const checkDevice = (board, timeout = 1000) => {
  let controller;
  const checker = new Promise((resolve, reject) => {
    controller = resolve;
    const check = () => {
      setTimeout(() => {
        if (board.connected) {
          check();
        } else {
          reject('disconnected');
        }
      }, timeout);
    };
    check();
  });
  return {
    cancel() {
      return controller();
      return this;
    },
    catch(...args) {
      checker.catch(...args);
      return this;
    },
    then(...args) {
      checker.then(...args);
      return this;
    },
    finally(...args) {
      checker.finally(...args);
      return this;
    },
  };
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
  await board.execRaw(line);
  await board.exitRawRepl();
};

export const checkFlashFree = async (board, files) => {
  await board.stop();
  let size = 0;
  for (const file of files) {
    size += file.content?.length ?? file.data?.length ?? 0;
  }
  await board.enterRawRepl();
  let out = await board.execRaw('from device.flash import check_flash_free\n');
  if (out.includes('ImportError: ')) return true;
  out = await board.execRaw(`print(check_flash_free(${size}))\n`);
  await board.exitRawRepl();
  return out.slice(2, -3).trim() === 'True';
};

export const eraseAll = async (board, exclude) => {
  await board.stop();
  await board.enterRawRepl();
  await board.execRaw('import download_screen\n');
  let line = 'from device.flash import erase_all\n';
  line += `erase_all(${exclude ? JSON.stringify(exclude) : ''})\n`;
  await board.execRaw(line);
  await board.exitRawRepl();
};

export const writeFiles = async (board, files, progress) => {
  await board.stop();

  await board.enterRawRepl();
  await board.execRaw('import download_screen\n');
  await board.exitRawRepl();

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
