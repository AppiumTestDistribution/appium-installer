#!/usr/bin/env node
import { listEmulators, androidSetup } from './emulators.js';
import inquirer from 'inquirer';
import {
  installAppiumServer,
  getDriver,
  installDrivers,
  installPlugin,
  runAppiumDoctor,
} from './serverInstall.js';
import { iOSSetup } from './ios';
import Logger from './logger.js';
import chalk from 'chalk';

const ui = new Logger().getInstance();

const options = [
  {
    name: 'Need help setting up Android Environment to run your Appium test?',
    fn: androidSetup,
    value: 'android-setup',
  },
  {
    name: 'Need help setting up iOS Environment to run your Appium test?',
    fn: iOSSetup,
    value: 'android-setup',
  },
  {
    name: 'Install Appium Server',
    fn: installAppiumServer,
    value: 'install-server',
  },
  {
    name: 'Install Appium Drivers',
    fn: installRequiredDrivers,
    value: 'install-drivers',
  },
  {
    name: 'Install Appium Plugin',
    fn: installPlugin,
    value: 'install-plugin',
  },
  {
    name: 'Run Appium Doctor',
    fn: runAppiumDoctor,
    value: 'run-doctor',
  },
  {
    name: 'Launch Emulators/Simulators',
    fn: listEmulators,
    value: 'run-emulator',
  },
  {
    name: 'Exit',
    fn: async () => {
      ui.log.write('Exiting Appium Installer...\n');
      process.exit(0);
    },
    value: 'exit',
  },
];

async function main() {
  const nodeMajorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
  if (nodeMajorVersion < 16) {
    ui.log.write(`\n👋 Hello, Appium user ✨\n\n`);
    ui.log.write(`\n‼️  BEFORE YOU START:\n\n`);
    ui.log.write(`🌐 Make sure you have node 16 and above\n\n`);
    ui.log.write(`Your current node version is ${process.version}\n\n`);
    process.exit(1);
  }

  ui.log.write(`\n👋 Hello, Appium user ✨\n\n`);

  while (true) {
    const { selectedOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedOption',
        message: 'Select an option',
        choices: options.map((option) => option.name),
      },
    ]);

    const currentOption = options.find((option) => option.name === selectedOption);
    if (!currentOption) {
      throw new Error(`Invalid menu option selected: ${selectedOption}`);
    }

    await currentOption.fn();
    ui.log.write(chalk.green(`${currentOption.name} COMPLETED\n`));
  }
}

async function installRequiredDrivers() {
  const driverChoices = await getDriver();
  const requiredDriverToInstall = await inquirer.prompt([
    {
      type: 'checkbox',
      message: 'Select Drivers to install',
      name: 'drivers',
      choices: driverChoices,
    },
  ]);
  await installDrivers(requiredDriverToInstall.drivers);
  ui.log.write('\n');
}

main();