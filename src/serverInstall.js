import inquirer from 'inquirer';

import ora from 'ora';
import { plugins } from './plugin.js';
import Logger from './logger.js';

const ui = new Logger().getInstance();
// @ts-ignore
import shelljs from 'shelljs';
import chalk from 'chalk';
import path from 'path';

async function validateAndInstallUserSelectedServerVersion() {
  const { enteredVersion } = await inquirer.prompt([
    {
      type: 'input',
      name: 'enteredVersion',
      message: 'Enter your Server version number: ',
    },
  ]);

  shelljs
    .exec(`npm view 'appium@*' versions`, {
      silent: true,
    })
    .includes(enteredVersion)
    ? await installAppiumServerWithVersion(enteredVersion)
    : await retryAppiumServerInstall();
}

async function retryAppiumServerInstall() {
  newLine();
  ui.log.write(chalk.red(`Please try again with a valid version number...`));
  await installAppiumServer();
}

export async function installAppiumServer() {
  newLine();

  const options = [
    {
      name: 'Select latest Server version: ',
      fn: installAppiumServerWithVersion,
      value: 1,
    },
    {
      name: 'Select custom Server version: ',
      fn: validateAndInstallUserSelectedServerVersion,
      value: 2,
    },
  ];

  const { selectedChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedChoice',
      message: 'Choose your version: ',
      choices: options.map((option) => option.name),
    },
  ]);

  const currentOption = options.find((option) => option.name === selectedChoice);

  currentOption.value === 1 ? await currentOption.fn('latest') : await currentOption.fn();

  ui.log.write('\n');
}

async function installAppiumServerWithVersion(selectedVersion) {
  const spinner = ora('Installing Appium Server').start();
  try {
    shelljs.exec(`npm install -g appium@${selectedVersion}`);
    const { stdout } = shelljs.exec('appium -v');
    spinner.succeed(`💥 💥 💥 Successfully installed server version ${stdout}`);
  } catch (err) {
    spinner.fail(err);
    throw new Error(err);
  } finally {
    spinner.stop();
  }
  newLine();
}

export async function getDriver() {
  newLine();
  let drivers = [];
  const spinner = ora('Fetching available official drivers').start();

  try {
    const { stdout } = shelljs.exec('appium driver list --json');
    Object.keys(JSON.parse(stdout)).forEach((value) => drivers.push({ name: value }));
    spinner.succeed();
    return drivers;
  } catch (err) {
    spinner.fail(err);
    spinner.stop();
  } finally {
    spinner.stop();
  }
}

export async function installDrivers(driverName) {
  newLine();

  const driverVersion = await inquirer.prompt([
    {
      type: 'checkbox',
      message: `Install ${driverName} driver version`,
      name: 'drivers',
      choices: ['latest', 'custom'],
    },
  ]);

  await appiumDriverInstallChoice(driverVersion, driverName);
}

async function appiumDriverInstallChoice(driverVersion, driverName) {
  if (driverVersion.drivers[0] === 'latest') {
    console.log(`Installing latest ${driverName} driver...`);
    await shelljs.exec(`appium driver uninstall ${driverName}`);
    await shelljs.exec(`appium driver install ${driverName}`);
  }
  if (driverVersion.drivers[0] === 'custom') {
    console.log(`Installing custom ${driverName} driver...`);
    const { enteredVersion } = await inquirer.prompt([
      {
        type: 'input',
        name: 'enteredVersion',
        message: `Enter the ${driverName} version number: `,
      },
    ]);

    let driverStr = null;
    const driverStrFirst = "npm view 'appium";
    const driverStrSecond = "driver@*' versions";

    switch (driverName) {
      case 'espresso':
        driverStr = driverStrFirst + '-espresso-' + driverStrSecond;
        break;
      case 'uiautomator2':
        driverStr = driverStrFirst + '-uiautomator2-' + driverStrSecond;
        break;
      case 'mac2':
        driverStr = driverStrFirst + '-mac2-' + driverStrSecond;
        break;
      case 'gecko':
        driverStr = driverStrFirst + '-gecko' + driverStrSecond;
        break;
      case 'chromium':
        driverStr = driverStrFirst + '-chromium-' + driverStrSecond;
        break;
      case 'safari':
        driverStr = driverStrFirst + '-safari-' + driverStrSecond;
        break;
      case 'xcuitest':
        driverStr = driverStrFirst + '-xcuitest-' + driverStrSecond;
        break;
    }

    await shelljs
      .exec(`${driverStr}`, {
        silent: true,
      })
      .includes(enteredVersion)
      ? await installSelectedDriverWithSpecificVersion(driverName, enteredVersion)
      : await retrySelectedDriverInstall(driverName);
  }
}

async function installSelectedDriverWithSpecificVersion(driverName, enteredVersion) {
  await shelljs.exec(`appium driver uninstall ${driverName}`);
  await shelljs.exec(`appium driver install ${driverName}@${enteredVersion}`);
}

async function retrySelectedDriverInstall(driverName) {
  newLine();
  ui.log.write(chalk.red(`Please try again with a valid version number...`));
  await installDrivers(driverName);
}

export async function runAppiumDoctor() {
  const { platform } = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      choices: ['android', 'ios', 'dev'],
    },
  ]);
  const doctorPath = path.join(__dirname + '/../node_modules/.bin/appium-doctor');
  shelljs.exec(`${doctorPath} --${platform}`);
}

export async function installPlugin() {
  const requiredPlugins = await inquirer.prompt([
    {
      type: 'checkbox',
      message: 'Select Plugins to install',
      name: 'plugins',
      choices: plugins,
      validate(answer) {
        if (answer.length < 1) {
          return 'You must choose at least one plugin.';
        }
        return true;
      },
    },
  ]);
  const { source } = await inquirer.prompt([
    {
      type: 'list',
      message: 'Source ',
      name: 'source',
      choices: ['npm', 'github', 'git', 'local'],
    },
  ]);
  let pluginPath;
  if (source !== 'npm') {
    const path = await inquirer.prompt([
      {
        name: 'pluginPath',
        message: 'Source of plugin',
      },
    ]);
    pluginPath = path.pluginPath;
  }

  const installedPlugins = shelljs.exec('appium plugin list --installed --json', { silent: true });
  let pluginNamesInstalled = Object.entries(JSON.parse(installedPlugins.stdout));
  let pluginInformation = [];
  pluginNamesInstalled.map(([key, val]) => {
    // @ts-ignore
    pluginInformation.push({ pluginName: key, plugin: val.pkgName, installed: val.installed });
  });
  await Promise.all(
    requiredPlugins.plugins.map(async (pluginName) => {
      newLine();
      const pluginExists = pluginInformation.find((name) => name.plugin === pluginName);
      if (pluginExists !== undefined) {
        ui.log.write(chalk.yellow(`ℹ️  Plugin ${pluginName} already installed`));
        newLine();
        ui.log.write(chalk.yellow(`ℹ️  Checking if any update available for plugin ${pluginName}`));
        newLine();
        shelljs.exec(`appium plugin update ${pluginExists.pluginName}`);
        return;
      } else {
        if (!pluginPath) {
          shelljs.exec(`appium plugin install --source ${source} ${pluginName}`);
        } else {
          shelljs.exec(`appium plugin install --source ${source} --package ${pluginPath} plugin`);
        }
      }
    })
  );
}

function newLine() {
  ui.log.write('\n');
}
