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
import { showEnvironmentStatus } from './statusDashboard.js';
import { checkForUpdates } from './updateChecker.js';
import { manageDevices } from './deviceManager.js';
import { runSetupProfile } from './setupProfiles.js';
import Logger from './logger.js';
import chalk from 'chalk';

const ui = new Logger().getInstance();

const BANNER = `
${chalk.cyan('    ╔═╗ ╔═╗ ╔═╗ ╦ ╦ ╔╦╗')}
${chalk.cyan('    ╠═╣ ╠═╝ ╠═╝ ║ ║ ║║║')}
${chalk.cyan('    ╩ ╩ ╩   ╩   ╩ ╚═╝╩ ╩')}
${chalk.magenta('    ╦ ╔╗╔ ╔═╗ ╔╦╗ ╔═╗ ╦  ╦  ╔═╗ ╦═╗')}
${chalk.magenta('    ║ ║║║ ╚═╗  ║  ╠═╣ ║  ║  ║╣  ╠╦╝')}
${chalk.magenta('    ╩ ╝╚╝ ╚═╝  ╩  ╩ ╩ ╩═╝╩═╝╚═╝ ╩╚═')}

  ${chalk.bold.white('Appium Installer')} ${chalk.dim('v3.0.0')} ${chalk.dim('│')} ${chalk.dim('Your one-stop shop for Appium 2.0')}
  ${chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
`;

const tips = [
  '💡 Tip: Use "Quick Setup Profiles" to get started in seconds!',
  '💡 Tip: "Show Environment Status" gives you a full health check.',
  '💡 Tip: "Check for Updates" keeps your drivers & plugins fresh.',
  '💡 Tip: "Device Manager" lets you launch & shutdown devices easily.',
  '💡 Tip: Run "Appium Doctor" to diagnose environment issues.',
];

const options = [
  {
    name: `${chalk.green('🤖')}  Setup Android Environment`,
    fn: androidSetup,
    value: 'android-setup',
  },
  {
    name: `${chalk.white('🍎')}  Setup iOS Environment`,
    fn: iOSSetup,
    value: 'ios-setup',
  },
  {
    name: `${chalk.yellow('⚡')}  Quick Setup Profiles`,
    fn: runSetupProfile,
    value: 'setup-profiles',
  },
  new inquirer.Separator(' '),
  new inquirer.Separator(chalk.dim('   ────── Install & Configure ──────')),
  new inquirer.Separator(' '),
  {
    name: `${chalk.cyan('📦')}  Install Appium Server`,
    fn: installAppiumServer,
    value: 'install-server',
  },
  {
    name: `${chalk.cyan('🔌')}  Install Appium Drivers`,
    fn: installRequiredDrivers,
    value: 'install-drivers',
  },
  {
    name: `${chalk.cyan('🧩')}  Install Appium Plugins`,
    fn: installPlugin,
    value: 'install-plugin',
  },
  new inquirer.Separator(' '),
  new inquirer.Separator(chalk.dim('   ────── Diagnostics & Tools ──────')),
  new inquirer.Separator(' '),
  {
    name: `${chalk.green('🩺')}  Run Appium Doctor`,
    fn: runAppiumDoctor,
    value: 'run-doctor',
  },
  {
    name: `${chalk.blue('📊')}  Show Environment Status`,
    fn: showEnvironmentStatus,
    value: 'env-status',
  },
  {
    name: `${chalk.yellow('🔄')}  Check for Updates`,
    fn: checkForUpdates,
    value: 'check-updates',
  },
  new inquirer.Separator(' '),
  new inquirer.Separator(chalk.dim('   ────── Devices ─────────────────')),
  new inquirer.Separator(' '),
  {
    name: `${chalk.magenta('🚀')}  Launch Emulators/Simulators`,
    fn: listEmulators,
    value: 'run-emulator',
  },
  {
    name: `${chalk.magenta('📱')}  Device Manager`,
    fn: manageDevices,
    value: 'device-manager',
  },
  new inquirer.Separator(' '),
  new inquirer.Separator(chalk.dim('   ─────────────────────────────────')),
  new inquirer.Separator(' '),
  {
    name: `${chalk.red('👋')}  Exit`,
    fn: async () => {
      ui.log.write(chalk.dim('\n  Thanks for using Appium Installer. Happy testing! 🎉\n'));
      process.exit(0);
    },
    value: 'exit',
  },
];

const menuChoices = options.filter((o) => !(o instanceof inquirer.Separator));

async function main() {
  const nodeMajorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
  if (nodeMajorVersion < 16) {
    ui.log.write(BANNER);
    ui.log.write(chalk.red.bold('  ⛔ Node.js 16+ is required\n'));
    ui.log.write(chalk.red(`  Your version: ${process.version}\n`));
    ui.log.write(chalk.dim('  Upgrade Node.js and try again.\n'));
    process.exit(1);
  }

  ui.log.write(BANNER);
  const tip = tips[Math.floor(Math.random() * tips.length)];
  ui.log.write(chalk.dim(`  ${tip}\n`));

  while (true) {
    const { selectedOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedOption',
        message: chalk.bold.white('What would you like to do?'),
        choices: options,
        pageSize: 20,
      },
    ]);

    const currentOption = menuChoices.find(
      (option) => option.value === selectedOption || option.name === selectedOption
    );
    if (!currentOption) {
      throw new Error(`Invalid menu option selected: ${selectedOption}`);
    }

    ui.log.write('');
    await currentOption.fn();
    if (currentOption.value !== 'exit') {
      ui.log.write(
        chalk.green.bold(`\n  ✅ ${currentOption.name.replace(/^.*?\s/, '')} — Done!\n`)
      );
    }
  }
}

async function installRequiredDrivers() {
  const driverChoices = await getDriver();
  await inquirer
    .prompt([
      {
        type: 'checkbox',
        message: 'Select Drivers to install',
        name: 'drivers',
        choices: driverChoices,
      },
    ])
    .then(async (answers) => {
      for (const value of answers.drivers) {
        await installDrivers(value);
      }
    })
    .catch((error) => {
      console.log(error);
    });
  ui.log.write('\n');
}

main();
