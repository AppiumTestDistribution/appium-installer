#!/usr/bin/env node
import inquirer from 'inquirer';

const ui = new inquirer.ui.BottomBar();
import {installAppiumServer, getDriver, installDrivers, installPlugin, runAppiumDoctor} from './serverInstall.js';
import chalk from 'chalk';

async function main() {
  ui.log.write(`\nđ Hello, Appium user â¨\n\n`);
  ui.log.write(`\n\nâźď¸  BEFORE YOU START:\n\n`);
  ui.log.write(`đ Make sure you have node 16 and above\n\n`);
  const { server } = await inquirer.prompt([
    {
      type: 'confirm',
      message: 'Do you want to install appium server',
      name: 'server',
    },
  ]);
  function skipInstall(value: string) {
    ui.log.write('\n');
    ui.log.write(chalk.yellow(value));
    ui.log.write('\n');
  }
    server === true
    ? await installAppiumServer()
    :  skipInstall('Appium Server installation skipped');

  const { drivers } = await inquirer.prompt([
    {
      type: 'confirm',
      message: 'Do you want to install appium drivers',
      name: 'drivers',
    },
  ]);

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
  drivers === true ? await installRequiredDrivers() : skipInstall('Appium Driver installation skipped');
  const { plugin } = await inquirer.prompt([
    {
      type: 'confirm',
      message: 'Do you want to install appium plugin',
      name: 'plugin',
    },
  ]);
  plugin === true
    ? await installPlugin()
    : skipInstall('Appium Plugin installation skipped');
  ui.log.write('\n');

  const { doctor } = await inquirer.prompt([
    {
      type: 'confirm',
      message: 'Do you want to run appium-doctor',
      name: 'doctor',
    },
  ]);
  doctor === true
      ? await runAppiumDoctor()
      : skipInstall('Appium Doctor check skipped');
  ui.log.write('\n');

  ui.log.write('\n');
  ui.log.write('â¨ All done! Thanks for using the Appium Installer');
}

main();
