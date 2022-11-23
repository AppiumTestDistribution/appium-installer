import inquirer from 'inquirer';
import { promisify } from 'util';
import { exec } from 'child_process';
const run = promisify(exec);
import ora, { Ora } from 'ora';
import { plugins } from './plugin.js';
const ui = new inquirer.ui.BottomBar();
// @ts-ignore
import shelljs from 'shelljs';
import chalk from 'chalk';

export async function installAppiumServer() {
  newLine();
  const spinner = ora('Installing Appium Server').start();
  try {
    await run('npm install -g appium@next');
    const { stdout } = await run('appium -v');
    spinner.succeed(`💥 💥 💥 Successfully installed server version ${stdout}`);
  } catch (err: any) {
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
  let drivers: { name: string }[] = [];
  const spinner = ora('Fetching available official drivers').start();

  try {
    const { stdout } = await run('appium driver list --json');
    Object.keys(JSON.parse(stdout)).forEach((value) => drivers.push({ name: value }));
    spinner.succeed();
    return drivers;
  } catch (err: any) {
    spinner.fail(err);
    spinner.stop();
  } finally {
    spinner.stop();
  }
}

export async function installDrivers(value: any) {
  await Promise.all(
    value.map(async (driverName: string) => {
      await shelljs.exec(`appium driver install ${driverName}`);
    })
  );
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
  let pluginPath: string;
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

  const installedPlugins = await shelljs.exec('appium plugin list --installed --json', { silent: true });
  let pluginNamesInstalled = Object.entries(JSON.parse(installedPlugins.stdout));
  let pluginInformation: { pluginName: string; plugin: any; installed: any; }[] = [];
  pluginNamesInstalled.map( ([key, val]) => {
    // @ts-ignore
    pluginInformation.push({pluginName: key, plugin: val.pkgName, installed: val.installed});
  });
  await Promise.all(
      requiredPlugins.plugins.map(async (pluginName: string) => {
        newLine();
        const pluginExists = pluginInformation.find(name => name.plugin === pluginName);
        if(pluginExists != undefined) {
            ui.log.write(chalk.yellow(`ℹ️  Plugin ${pluginName} already installed`));
            newLine();
            ui.log.write(chalk.yellow(`ℹ️  Checking if any update available for plugin ${pluginName}`));
            newLine();
            await shelljs.exec(`appium plugin update ${pluginExists.pluginName}`);
            return;
          } else {
          if (!pluginPath) {
            await shelljs.exec(`appium plugin install --source ${source} ${pluginName}`);
          } else {
            await shelljs.exec(`appium plugin install --source ${source} --package ${pluginPath} plugin`);
          }
        }
      })
  );

}
