import inquirer from 'inquirer';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);

export async function listEmulators() {
  const platform = process.platform;
  let emulatorCmd, emulatorList, emulatorsOrSimulators;

  if (platform === 'darwin') {
    emulatorsOrSimulators = await inquirer.prompt([
      {
        type: 'checkbox',
        message: 'Do you want to launch emulators/simulators?',
        name: 'emusim',
        choices: ['Android Emulators', 'iOS Simulators'],
        validate(answer) {
          if (answer.length < 1) {
            return 'You must choose at least one option.';
          }
          return true;
        },
      },
    ]);
    if (emulatorsOrSimulators.emusim[0] === 'Android Emulators') {
      emulatorCmd = 'emulator -list-avds';
    } else {
      emulatorCmd = 'xcrun simctl list devices';
    }
  } else if (platform === 'win32') {
    emulatorCmd = 'emulator -list-avds';
  } else {
    console.log('Unsupported platform');
    return;
  }

  try {
    const { stdout } = await execAsync(emulatorCmd);
    if (emulatorsOrSimulators.emusim[0] === 'iOS Simulators') {
      emulatorList = stdout
        .split('\n')
        .filter((line) => line.includes('(Booted)') || line.includes('(Shutdown)'));
    } else {
      emulatorList = stdout.split('\n');
    }
    if (emulatorList.length === 0) {
      console.log('No emulators found');
      return;
    }

    const selectedEmulator = await inquirer.prompt([
      {
        type: 'checkbox',
        message: 'Select emulators to launch',
        name: 'emulators',
        choices: emulatorList,
        validate(answer) {
          if (answer.length < 1) {
            return 'You must choose at least one emulator.';
          }
          return true;
        },
      },
    ]);
    let emulatorID;
    const emulatorString = selectedEmulator.emulators[0];
    if (emulatorsOrSimulators.emusim[0] === 'iOS Simulators') {
      emulatorID = emulatorString.split('(')[1].split(')')[0];
    } else {
      emulatorID = emulatorString;
    }

    console.log(`Launching ${emulatorID}...`);
    if (platform === 'darwin' && emulatorsOrSimulators.emusim[0] === 'Android Emulators') {
      const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      if (!androidHome) {
        console.log('ANDROID_HOME/ANDROID_SDK_ROOT environment variable is not set');
        return;
      }

      const emulatorCmd = path.join(androidHome, 'emulator', 'emulator');
      const avdArgs = `-avd ${emulatorID} `;

      try {
        await execAsync(`${emulatorCmd} ${avdArgs} -no-window`);
        console.log(`Emulator ${emulatorID} started successfully.`);
      } catch (error) {
        console.error(`Failed to start emulator ${emulatorID}. Error: ${error}`);
      }
    } else if (platform === 'darwin' && emulatorsOrSimulators.emusim[0] === 'iOS Simulators') {
      await execAsync(`xcrun simctl boot ${emulatorID}`);
    } else if (platform === 'win32') {
      await execAsync(`emulator -avd ${emulatorID}`);
    }
  } catch (error) {
    console.error(error);
  }
}
