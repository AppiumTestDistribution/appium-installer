#!/usr/bin/env node
import inquirer from 'inquirer';
import {
  installAppiumServer,
  getDriver,
  installDrivers,
  installPlugin,
  runAppiumDoctor,
} from './serverInstall.js';
import os from 'os';
import path from 'path';
import download from 'download';
import extract from 'extract-zip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ui = new inquirer.ui.BottomBar();

type MenuOption = {
  name: string;
  fn: () => Promise<void>;
  value: string;
};

const options: MenuOption[] = [
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
    name: 'Install Appium Inspector',
    fn: installAppiumInspector,
    value: 'install-inspector',
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
    ui.log.write(`${currentOption.name} completed\n`);
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

async function installAppiumInspector() {
  const platform = os.platform();
  const arch = os.arch();
  let inspectorUrl;

  if (platform === 'darwin') {
    inspectorUrl = `https://github.com/appium/appium-inspector/releases/latest/download/Appium-Inspector-2023.3.1-universal-mac.zip`;
  } else if (platform === 'win32') {
    inspectorUrl = `https://github.com/appium/appium-inspector/releases/latest/download/appium-inspector-win32-x64.zip`;
  } else if (platform === 'linux') {
    if (arch === 'x64') {
      inspectorUrl = `https://github.com/appium/appium-inspector/releases/latest/download/appium-inspector-linux-x64.zip`;
    } else {
      ui.log.write(`Unsupported architecture: ${arch} for Linux platform\n`);
      return;
    }
  } else {
    ui.log.write(`Unsupported platform: ${platform}\n`);
    return;
  }

  const inspectorFileName = path.basename(inspectorUrl);
  let inspectorFilePath = path.join(__dirname, inspectorFileName);

  ui.log.write(`Downloading Appium Inspector for ${platform}...\n`);
  await downloadFile(inspectorUrl, inspectorFilePath);
  const urlFileName = inspectorUrl.substring(inspectorUrl.lastIndexOf('/') + 1);
  inspectorFilePath = path.join(__dirname, urlFileName);

  ui.log.write(`Extracting Appium Inspector...\n`);
  await extract(inspectorFilePath, { dir: __dirname });

  ui.log.write(`Appium Inspector installed successfully\n`);
}

async function downloadFile(url: string, dest: string) {
  await download(url, dest, { followRedirect: true });
}

main();
