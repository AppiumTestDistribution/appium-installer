#!/usr/bin/env node
import inquirer from 'inquirer';

const ui = new inquirer.ui.BottomBar();
import { installAppiumServer, getDriver, installDrivers, installPlugin } from './serverInstall.js';
import chalk from 'chalk';

async function main() {
  ui.log.write(`\n👋 Hello, Appium user ✨\n\n`);
  ui.log.write(`‼️  BEFORE YOU START:\n`);
  ui.log.write(`🐍 Make sure you have node 16 and above`);
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
  ui.log.write('\n');

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

  ui.log.write('\n');
  ui.log.write('✨ All done! Thanks for using the Appium Installer');
}

main();
