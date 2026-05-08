import { spawn } from 'child_process';
import shelljs from 'shelljs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import path from 'path';
import Logger from './logger.js';

const ui = new Logger().getInstance();

function getAdbDevices() {
  const result = shelljs.exec('adb devices -l', { silent: true });
  if (result.code !== 0) return [];
  const lines = result.stdout.split('\n').slice(1);
  const devices = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const serial = parts[0];
    const status = parts[1];
    const modelMatch = trimmed.match(/model:(\S+)/);
    const model = modelMatch ? modelMatch[1] : serial;
    const isEmulator = serial.startsWith('emulator-');
    devices.push({
      serial,
      status,
      model,
      name: model,
      platform: 'Android',
      type: isEmulator ? 'emulator' : 'real',
      osVersion: '-',
    });
  }
  return devices;
}

function getAvailableAVDs(runningDevices) {
  const result = shelljs.exec('emulator -list-avds', { silent: true });
  if (result.code !== 0) return [];
  const runningSerials = runningDevices
    .filter((d) => d.type === 'emulator')
    .map((d) => d.serial);
  return result.stdout
    .split('\n')
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name) => {
      const isRunning = runningSerials.length > 0;
      return {
        name,
        platform: 'Android',
        type: 'avd',
        status: isRunning ? 'Check running' : 'Available',
        osVersion: '-',
        serial: '-',
      };
    });
}

function getIOSSimulatorsFull() {
  if (process.platform !== 'darwin') return [];
  const result = shelljs.exec('xcrun simctl list --json devices', { silent: true });
  if (result.code !== 0) return [];
  try {
    const data = JSON.parse(result.stdout);
    const devices = [];
    for (const [runtime, sims] of Object.entries(data.devices)) {
      if (!runtime.includes('iOS')) continue;
      const versionMatch = runtime.match(/iOS[- ](\d+[-.]\d+)/);
      const osVersion = versionMatch ? versionMatch[1].replace('-', '.') : 'unknown';
      for (const sim of sims) {
        if (!sim.isAvailable) continue;
        devices.push({
          name: sim.name,
          platform: 'iOS',
          type: 'simulator',
          status: sim.state,
          osVersion,
          serial: sim.udid,
        });
      }
    }
    return devices;
  } catch (e) {
    return [];
  }
}

function statusIcon(status) {
  switch (status) {
    case 'device':
    case 'Booted':
      return chalk.green('●');
    case 'offline':
    case 'unauthorized':
      return chalk.red('●');
    case 'Available':
    case 'Shutdown':
      return chalk.dim('○');
    default:
      return chalk.yellow('◐');
  }
}

function statusLabel(status) {
  switch (status) {
    case 'device':
      return chalk.green.bold('Online');
    case 'Booted':
      return chalk.green.bold('Booted');
    case 'offline':
      return chalk.red('Offline');
    case 'unauthorized':
      return chalk.red('Unauth');
    case 'Available':
      return chalk.dim('Ready');
    case 'Shutdown':
      return chalk.dim('Stopped');
    default:
      return chalk.yellow(status);
  }
}

function platformLabel(platform) {
  return platform === 'Android'
    ? chalk.green('Android')
    : chalk.blue('iOS');
}

function displayDeviceTable(devices) {
  ui.log.write('');
  ui.log.write(chalk.bold.white('  📱  Device Manager'));
  ui.log.write(chalk.dim('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  ui.log.write('');

  if (devices.length === 0) {
    ui.log.write(chalk.dim('    No devices found.'));
    ui.log.write(chalk.dim('    Create an emulator in Android Studio or connect a real device.\n'));
    return;
  }

  // Count stats
  const running = devices.filter(
    (d) => d.status === 'device' || d.status === 'Booted'
  ).length;
  const available = devices.filter(
    (d) => d.status === 'Available' || d.status === 'Shutdown'
  ).length;
  const androidCount = devices.filter((d) => d.platform === 'Android').length;
  const iosCount = devices.filter((d) => d.platform === 'iOS').length;

  ui.log.write(
    `  ${chalk.green('●')} ${chalk.bold(running)} running   ${chalk.dim('○')} ${chalk.bold(available)} available   ${chalk.dim('|')}   ${chalk.green('Android')} ${androidCount}   ${chalk.blue('iOS')} ${iosCount}`
  );
  ui.log.write('');

  // Compute dynamic column widths
  const col = { num: 4, name: 4, plat: 8, os: 4, stat: 7, id: 2 };
  for (const d of devices) {
    col.name = Math.max(col.name, d.name.length);
    col.os = Math.max(col.os, (d.osVersion || '-').length);
    col.id = Math.max(col.id, (d.serial || '-').length);
  }
  // Cap columns to reasonable max
  col.name = Math.min(col.name, 28);
  col.id = Math.min(col.id, 22);

  // Table header
  const hdr =
    `  ${chalk.dim('#'.padEnd(col.num))}` +
    `${chalk.dim('Name'.padEnd(col.name + 2))}` +
    `${chalk.dim('Platform'.padEnd(col.plat + 2))}` +
    `${chalk.dim('OS'.padEnd(col.os + 2))}` +
    `${chalk.dim('Status'.padEnd(col.stat + 4))}` +
    `${chalk.dim('ID')}`;
  ui.log.write(hdr);
  const totalWidth = col.num + col.name + col.plat + col.os + col.stat + col.id + 12;
  ui.log.write(chalk.dim(`  ${'─'.repeat(totalWidth)}`));

  devices.forEach((device, index) => {
    const num = chalk.cyan(`${index + 1}`.padEnd(col.num));
    const name = device.name.substring(0, col.name).padEnd(col.name + 2);
    const platRaw = device.platform;
    const platStr = platformLabel(device.platform);
    const platPadded = platStr + ' '.repeat(Math.max(0, col.plat + 2 - platRaw.length));
    const os = (device.osVersion || '-').padEnd(col.os + 2);
    const stat = `${statusIcon(device.status)} ${statusLabel(device.status)}`;
    const rawStatLabel = stat.replace(/\x1b\[[0-9;]*m/g, '');
    const statPadded = stat + ' '.repeat(Math.max(0, col.stat + 4 - rawStatLabel.length));
    const id = chalk.dim((device.serial || '-').substring(0, col.id));

    ui.log.write(`  ${num}${name}${platPadded}${os}${statPadded}${id}`);
  });

  ui.log.write(chalk.dim(`  ${'─'.repeat(totalWidth)}`));
  ui.log.write('');
}

async function launchAndroidAVD(avdName) {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome) {
    ui.log.write(chalk.red('\n  ⛔ ANDROID_HOME/ANDROID_SDK_ROOT is not set.\n'));
    return;
  }
  const emulatorCmd = path.join(androidHome, 'emulator', 'emulator');
  const spinner = ora({ text: `🚀 Launching ${avdName}...`, spinner: 'dots12' }).start();
  try {
    spawn(emulatorCmd, ['-avd', avdName], { detached: true, stdio: 'ignore' }).unref();
    spinner.succeed(chalk.green(`🚀 ${avdName} launch initiated`));
  } catch (err) {
    spinner.fail(chalk.red(`Failed to launch ${avdName}: ${err.message}`));
  }
}

async function launchIOSSimulator(udid, name) {
  const spinner = ora({ text: `🚀 Launching ${name}...`, spinner: 'dots12' }).start();
  const bootResult = shelljs.exec(`xcrun simctl boot ${udid}`, { silent: true });
  if (bootResult.code !== 0 && !bootResult.stderr.includes('current state: Booted')) {
    spinner.fail(chalk.red(`Failed to launch ${name}`));
    return;
  }
  shelljs.exec('open -a Simulator.app', { silent: true });
  spinner.succeed(chalk.green(`🚀 ${name} launched`));
}

async function shutdownAndroidEmulator(serial) {
  const spinner = ora({ text: `🛑 Shutting down ${serial}...`, spinner: 'dots12' }).start();
  const result = shelljs.exec(`adb -s ${serial} emu kill`, { silent: true });
  result.code === 0
    ? spinner.succeed(chalk.green(`🛑 ${serial} shut down`))
    : spinner.fail(chalk.red(`Failed to shut down ${serial}`));
}

async function shutdownIOSSimulator(udid, name) {
  const spinner = ora({ text: `🛑 Shutting down ${name}...`, spinner: 'dots12' }).start();
  const result = shelljs.exec(`xcrun simctl shutdown ${udid}`, { silent: true });
  result.code === 0
    ? spinner.succeed(chalk.green(`🛑 ${name} shut down`))
    : spinner.fail(chalk.red(`Failed to shut down ${name}`));
}

function getAllDevices() {
  const adbDevices = getAdbDevices();
  const avds = getAvailableAVDs(adbDevices);
  const iosSimulators = getIOSSimulatorsFull();
  return [...adbDevices, ...avds, ...iosSimulators];
}

export async function manageDevices() {
  let continueLoop = true;

  while (continueLoop) {
    const spinner = ora({ text: chalk.cyan('Scanning for devices...'), spinner: 'dots12' }).start();
    const devices = getAllDevices();
    spinner.succeed(chalk.green(`Found ${devices.length} device(s)`));

    displayDeviceTable(devices);

    const actions = [
      new inquirer.Separator(chalk.dim('  ──── Actions ────')),
      { name: `${chalk.green('🚀')} Launch a device`, value: 'launch' },
      { name: `${chalk.red('🛑')} Shutdown a device`, value: 'shutdown' },
      { name: `${chalk.yellow('⚡')} Launch multiple devices`, value: 'multi-launch' },
      new inquirer.Separator(chalk.dim('  ─────────────────')),
      { name: `${chalk.cyan('🔄')} Refresh device list`, value: 'refresh' },
      { name: `${chalk.dim('👈')} Back to main menu`, value: 'back' },
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold.white('What would you like to do?'),
        choices: actions,
      },
    ]);

    switch (action) {
      case 'launch': {
        const launchable = devices.filter(
          (d) =>
            (d.type === 'avd') ||
            (d.type === 'simulator' && d.status === 'Shutdown')
        );
        if (launchable.length === 0) {
          ui.log.write(chalk.yellow('\n  ⚠  No devices available to launch.\n'));
          break;
        }
        const { device } = await inquirer.prompt([
          {
            type: 'list',
            name: 'device',
            message: 'Select a device to launch',
            choices: launchable.map((d) => ({
              name: `${platformLabel(d.platform)} ${d.name}`,
              value: d,
            })),
          },
        ]);
        if (device.type === 'avd') {
          await launchAndroidAVD(device.name);
        } else if (device.type === 'simulator') {
          await launchIOSSimulator(device.serial, device.name);
        }
        break;
      }

      case 'shutdown': {
        const shutdownable = devices.filter(
          (d) =>
            (d.type === 'emulator' && d.status === 'device') ||
            (d.type === 'simulator' && d.status === 'Booted')
        );
        if (shutdownable.length === 0) {
          ui.log.write(chalk.yellow('\n  ⚠  No running devices to shut down.\n'));
          break;
        }
        const { device } = await inquirer.prompt([
          {
            type: 'list',
            name: 'device',
            message: 'Select a device to shut down',
            choices: shutdownable.map((d) => ({
              name: `${platformLabel(d.platform)} ${d.name}`,
              value: d,
            })),
          },
        ]);
        if (device.platform === 'Android') {
          await shutdownAndroidEmulator(device.serial);
        } else {
          await shutdownIOSSimulator(device.serial, device.name);
        }
        break;
      }

      case 'multi-launch': {
        const launchable = devices.filter(
          (d) =>
            (d.type === 'avd') ||
            (d.type === 'simulator' && d.status === 'Shutdown')
        );
        if (launchable.length === 0) {
          ui.log.write(chalk.yellow('\n  ⚠  No devices available to launch.\n'));
          break;
        }
        const { selectedDevices } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedDevices',
            message: 'Select devices to launch',
            choices: launchable.map((d) => ({
              name: `${platformLabel(d.platform)} ${d.name}`,
              value: d,
            })),
            validate(answer) {
              if (answer.length < 1) {
                return 'Select at least one device.';
              }
              return true;
            },
          },
        ]);
        ui.log.write('');
        for (const device of selectedDevices) {
          if (device.type === 'avd') {
            await launchAndroidAVD(device.name);
          } else if (device.type === 'simulator') {
            await launchIOSSimulator(device.serial, device.name);
          }
        }
        break;
      }

      case 'refresh':
        break;

      case 'back':
        continueLoop = false;
        break;
    }
  }

  ui.log.write('');
}
