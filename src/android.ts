//Reference https://github.com/wswebcreation/start-android-emulator/blob/master/lib/index.js

import { spawn, execFileSync } from 'child_process';
import { existsSync } from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { join, normalize } from 'path';
import { platform } from 'os';
import { getSdkRootFromEnv } from 'appium-adb';
import fs from 'fs';
const OS_TYPE = platform();

const MESSAGE_TYPES = {
  ERROR: 'error',
  NOTIFY: 'notify',
};

export async function startAndroidEmulator() {
  const emulators = getEmulators();
  const questions = [
    {
      type: 'list',
      name: 'emulator',
      message: 'Which emulator do you want to start?',
      choices: emulators,
    },
    {
      type: 'list',
      name: 'wipeData',
      message:
        'Do you want to wipe data (delete all user data and copy data from the initial data file)?',
      choices: ['No', 'Yes'],
    },
    {
      type: 'list',
      name: 'dnsServer',
      message:
        "Do you want to start with `-dns-server 8.8.8.8` (Needed when the Emulator doesn't has wifi)?",
      choices: ['No', 'Yes'],
    },
  ];

  logMessage(MESSAGE_TYPES.NOTIFY, 'Android Emulator CLI Helper');

  if (emulators.length > 0) {
    const answers = await inquirer.prompt(questions);
    startEmulator(answers);
  } else {
    logMessage(MESSAGE_TYPES.ERROR, 'NO ANDROID EMULATORS SPECIFIED');
  }
}

function startEmulator(answers: any) {
  try {
    logMessage(
      MESSAGE_TYPES.NOTIFY,
      `${answers.emulator} is being started. You can close the device with 'X'-button on the toolbar of the device.`
    );

    const options: any = {};

    if (OS_TYPE === 'win32') {
      options.shell = true;
    }

    const runOnEmulator = spawn(
      normalize(join(getSdkRootFromEnv() as string, '/emulator/emulator')),
      ['-avd', answers.emulator, answers.wipeData === 'Yes' ? '-wipe-data' : '-no-snapshot'].concat(
        answers.dnsServer === 'Yes' ? ['-dns-server', '8.8.8.8'] : []
      ),
      options
    );
    runOnEmulator.on('close', function (code) {
      process.stdout.write('Android Emulator is booted!!');
    });
  } catch (e: any) {
    let errorMessage;

    if (e.message.includes("Cannot read property 'toString' of null")) {
      errorMessage =
        'It looks like the `emulator` has not been set correct in your environment variables. ' +
        'Please check this article on how to fix it.' +
        '\n\n  https://developer.android.com/studio/command-line/variables for more details';
    } else if (!existsSync(getSdkRootFromEnv() as string)) {
      errorMessage =
        'The environment variable `ANDROID_HOME` is not found. Did you set your `ANDROID_HOME` correct?';
    } else {
      errorMessage = `The error\n\n${e}\n\n  occurred and the emulator couldn't be started.   !Check Google what the problem could be!`;
    }

    logMessage(MESSAGE_TYPES.ERROR, errorMessage);
  }
}

function getEmulators() {
  const emulators = execFileSync(
    normalize(join(getSdkRootFromEnv() as string, '/emulator/emulator')),
    ['-list-avds'],
    { encoding: 'utf8' }
  )
    .replace(/\n$/, '')
    .split('\n');

  return emulators.filter((e) => !!e);
}

function logMessage(type: string, message: string) {
  const messageType = type === MESSAGE_TYPES.NOTIFY ? chalk.cyan : chalk.red;
  console.log(
    messageType(`
============================================================================================================================================
  
  ${message}
  
============================================================================================================================================
`)
  );
}
