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
  function skipServerInstall() {
    ui.log.write('\n');
    ui.log.write(chalk.yellow('Appium Server installation skipped'));
  }

  function skipPluginInstall() {
    ui.log.write('\n');
    ui.log.write(chalk.yellow('Appium Plugin installation skipped'));
  }
  server === true
    ? await installAppiumServer()
    :  skipServerInstall();
  ui.log.write('\n');
  const driverChoices = await getDriver();
  const requiredDriverToInstall = await inquirer.prompt([
    {
      type: 'checkbox',
      message: 'Select Drivers to install',
      name: 'drivers',
      choices: driverChoices,
      validate(answer) {
        if (answer.length < 1) {
          return 'Choose your driver';
        }
        return true;
      },
    },
  ]);
  await installDrivers(requiredDriverToInstall.drivers);
  const { plugin } = await inquirer.prompt([
    {
      type: 'confirm',
      message: 'Do you want to install appium plugin',
      name: 'plugin',
    },
  ]);
  plugin === true
    ? await installPlugin()
    : skipPluginInstall();
  ui.log.write('\n');

  ui.log.write('\n');
  ui.log.write('✨ All done! Thanks for using the Appium Installer');
}

main();
