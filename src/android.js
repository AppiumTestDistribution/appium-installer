import { exec, spawn } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);

export async function getAllEmulators() {
  const { stdout } = await execAsync('emulator -list-avds');
  return stdout.split('\n');
}

export async function launchEmulator(emulatorID) {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome) {
    console.log('ANDROID_HOME/ANDROID_SDK_ROOT environment variable is not set');
    return;
  }

  const emulatorCmd = path.join(androidHome, 'emulator', 'emulator');
  spawn(`${emulatorCmd}`, ['-avd', `${emulatorID}`]);
}
