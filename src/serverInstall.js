import inquirer from 'inquirer';

import ora from 'ora';
import { plugins } from './plugin.js';
import Logger from './logger.js';

const ui = new Logger().getInstance();
// @ts-ignore
import shelljs from 'shelljs';
import chalk from 'chalk';
import path from 'path';

export async function installAppiumServer() {
  newLine();
  const spinner = ora('Installing Appium Server').start();
  try {
    shelljs.exec('npm install -g appium@next');
    const { stdout } = shelljs.exec('appium -v');
    spinner.succeed(`💥 💥 💥 Successfully installed server version ${stdout}`);
  } catch (err) {
    spinner.fail(err);
    throw new Error(err);
  } finally {
    spinner.stop();
  }
  ui.log.write('\n');
}

function newLine() {
  ui.log.write('\n');
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

export async function installDrivers(value) {
  await Promise.all(
    value.map(async (driverName) => {
      shelljs.exec(`appium driver install ${driverName}`);
    })
  );
}

export async function runAppiumDoctor() {
  const { platform } = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      choices: ['android', 'ios', 'dev'],
    }
  ]);
  const doctorPath = path.join(__dirname + '/../node_modules/.bin/appium-doctor');
  shelljs.exec(`${doctorPath} --${platform}`)
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
    }
  ]);
  let pluginPath;
  if (source!= 'npm') {
    const path = await inquirer
        .prompt([
          {
            name: 'pluginPath',
            message: 'Source of plugin',
          },
        ])
    pluginPath = path.pluginPath;
  }

  const installedPlugins = shelljs.exec('appium plugin list --installed --json', { silent: true });
  let pluginNamesInstalled = Object.entries(JSON.parse(installedPlugins.stdout));
  let pluginInformation = [];
  pluginNamesInstalled.map( ([key, val]) => {
    // @ts-ignore
    pluginInformation.push({pluginName: key, plugin: val.pkgName, installed: val.installed});
  });
  await Promise.all(
      requiredPlugins.plugins.map(async (pluginName) => {
        newLine();
        const pluginExists = pluginInformation.find(name => name.plugin === pluginName);
        if(pluginExists != undefined) {
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
