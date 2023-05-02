import {exec, spawn} from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import Logger from './logger.js';
import {AndroidSetup} from "@nightwatch/mobile-helper";

const ui = new Logger().getInstance();

const execAsync = util.promisify(exec);

function getEmulatorLocation() {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  return path.join(androidHome, 'emulator', 'emulator');
}

export async function getAllEmulators() {
  const emulatorCmd = getEmulatorLocation();
  if (!fs.existsSync(emulatorCmd)) {
      ui.log.write('Found missing dependency for Android...\n');
      let androidSetup = new AndroidSetup();
      await androidSetup.run();
  }
  const { stdout } = await execAsync(`${emulatorCmd} -list-avds`);
  return stdout.split('\n');
}

export async function launchEmulator(emulatorID) {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome) {
    console.log('ANDROID_HOME/ANDROID_SDK_ROOT environment variable is not set');
    return;
  }

  spawn(`${getEmulatorLocation()}`, ['-avd', `${emulatorID}`]);
}
