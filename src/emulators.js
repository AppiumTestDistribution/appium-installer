import inquirer from 'inquirer';
import { getAllSimulators, launchSimulator } from './ios.js';
import { getAllEmulators, launchEmulator } from './android.js';
import { AndroidSetup } from '@nightwatch/mobile-helper';

export async function androidSetup() {
  const androidSetup = new AndroidSetup();
  await androidSetup.run();
}

export async function listEmulators() {
  const platform = process.platform;
  let emulatorList, emulatorsOrSimulators, emulatorID;

  if (platform === 'darwin') {
    emulatorsOrSimulators = await inquirer.prompt([
      {
        type: 'list',
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
    if (emulatorsOrSimulators.emusim === 'Android Emulators') {
      emulatorList = await getAllEmulators();
    } else {
      emulatorList = await getAllSimulators();
    }
  } else if (platform === 'win32') {
    emulatorList = await getAllEmulators();
  } else {
    console.log('Unsupported platform');
    return;
  }

  try {
    if (emulatorList && emulatorList.length === 0) {
      console.log('No emulators found');
      return;
    }

    const selectedEmulator = await inquirer.prompt([
      {
        type: 'list',
        message: 'Select emulators to launch',
        name: 'emulators',
        choices: emulatorList,
        validate(answer) {
          if (answer.length < 1) {
            return 'You must choose at least one emulator/simulator.';
          }
          return true;
        },
      },
    ]);
    const emulatorString = selectedEmulator.emulators;
    console.log(`Launching ${emulatorString}...`);

    if (platform === 'darwin' && emulatorsOrSimulators.emusim === 'Android Emulators') {
      await launchEmulator(emulatorString);
    } else if (platform === 'darwin' && emulatorsOrSimulators.emusim === 'iOS Simulators') {
      await launchSimulator(
        emulatorList.find((simulator) => simulator.name === emulatorString).udid
      );
    } else if (platform === 'win32') {
      await launchEmulator(emulatorString);
    }
    console.log(`Launching ${emulatorString} completed successfully`);
  } catch (error) {
    console.error(error);
  }
}
