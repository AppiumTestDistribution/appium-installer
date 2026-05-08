import shelljs from 'shelljs';
import chalk from 'chalk';
import ora from 'ora';
import Logger from './logger.js';

const ui = new Logger().getInstance();
const CHECK = chalk.green('✔');
const CROSS = chalk.red('✘');
const DOT = chalk.dim('•');

function parseAppiumJson(stdout) {
  const lines = stdout.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}

function getAppiumVersion() {
  const result = shelljs.exec('appium -v', { silent: true });
  return result.code === 0 ? result.stdout.trim() : null;
}

function getNodeVersion() {
  return process.version;
}

function getJavaVersion() {
  const result = shelljs.exec('java -version 2>&1', { silent: true });
  if (result.code !== 0) return null;
  const match = result.stdout.match(/version "(.+?)"/);
  return match ? match[1] : null;
}

function getXcodeVersion() {
  if (process.platform !== 'darwin') return null;
  const result = shelljs.exec('xcodebuild -version', { silent: true });
  if (result.code !== 0) return null;
  const firstLine = result.stdout.split('\n')[0];
  return firstLine ? firstLine.trim() : null;
}

function getEnvVariables() {
  return {
    ANDROID_HOME: process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || null,
    JAVA_HOME: process.env.JAVA_HOME || null,
  };
}

function getInstalledDrivers() {
  const result = shelljs.exec('appium driver list --installed --json', { silent: true });
  if (result.code !== 0) return [];
  const parsed = parseAppiumJson(result.stdout);
  if (!parsed) return [];
  return Object.entries(parsed).map(([name, info]) => ({
    name,
    version: info.version || 'unknown',
  }));
}

function getInstalledPlugins() {
  const result = shelljs.exec('appium plugin list --installed --json', { silent: true });
  if (result.code !== 0) return [];
  const parsed = parseAppiumJson(result.stdout);
  if (!parsed) return [];
  return Object.entries(parsed)
    .filter(([, info]) => info.installed)
    .map(([name, info]) => ({
      name,
      version: info.version || 'unknown',
    }));
}

function getConnectedAndroidDevices() {
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
    devices.push({ serial, status, model });
  }
  return devices;
}

function getIOSSimulators() {
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
        if (sim.state === 'Booted') {
          devices.push({ name: sim.name, osVersion, state: sim.state });
        }
      }
    }
    return devices;
  } catch (e) {
    return [];
  }
}

function box(title, emoji, lines) {
  const width = 56;
  const titleStr = `${emoji}  ${title}`;
  const pad = width - titleStr.length - 2;

  ui.log.write(chalk.cyan(`  ┌${'─'.repeat(width)}┐`));
  ui.log.write(chalk.cyan(`  │ ${chalk.bold.white(titleStr)}${' '.repeat(Math.max(pad, 0))} │`));
  ui.log.write(chalk.cyan(`  ├${'─'.repeat(width)}┤`));

  for (const line of lines) {
    const visible = line.replace(/\x1b\[[0-9;]*m/g, '');
    const linePad = width - visible.length - 2;
    ui.log.write(chalk.cyan('  │') + ` ${line}${' '.repeat(Math.max(linePad, 0))} ` + chalk.cyan('│'));
  }

  ui.log.write(chalk.cyan(`  └${'─'.repeat(width)}┘`));
}

function statusLine(label, value, ok) {
  const icon = ok ? CHECK : CROSS;
  const valColor = ok ? chalk.green(value) : chalk.red(value);
  return `${icon} ${chalk.white(label.padEnd(18))} ${valColor}`;
}

export async function showEnvironmentStatus() {
  const spinner = ora({
    text: chalk.cyan('Scanning your environment...'),
    spinner: 'dots12',
  }).start();

  const appiumVersion = getAppiumVersion();
  const nodeVersion = getNodeVersion();
  const javaVersion = getJavaVersion();
  const xcodeVersion = getXcodeVersion();
  const envVars = getEnvVariables();
  const drivers = getInstalledDrivers();
  const plugins = getInstalledPlugins();
  const androidDevices = getConnectedAndroidDevices();
  const iosSimulators = getIOSSimulators();

  spinner.succeed(chalk.green('Environment scan complete'));

  ui.log.write('');
  ui.log.write(chalk.bold.cyan('  ╔══════════════════════════════════════════════════════════╗'));
  ui.log.write(chalk.bold.cyan('  ║') + chalk.bold.white('          📊  Environment Status Dashboard  📊          ') + chalk.bold.cyan('║'));
  ui.log.write(chalk.bold.cyan('  ╚══════════════════════════════════════════════════════════╝'));
  ui.log.write('');

  // System section
  const systemLines = [
    statusLine('Appium Server', appiumVersion ? `v${appiumVersion}` : 'Not installed', !!appiumVersion),
    statusLine('Node.js', nodeVersion, true),
    statusLine('Java', javaVersion ? `v${javaVersion}` : 'Not installed', !!javaVersion),
  ];
  if (process.platform === 'darwin') {
    systemLines.push(
      statusLine('Xcode', xcodeVersion || 'Not installed', !!xcodeVersion)
    );
  }
  box('System', '🖥️ ', systemLines);

  ui.log.write('');

  // Environment variables
  const envLines = [
    statusLine('ANDROID_HOME', envVars.ANDROID_HOME ? chalk.dim('.../' + envVars.ANDROID_HOME.split('/').slice(-2).join('/')) : 'Not set', !!envVars.ANDROID_HOME),
    statusLine('JAVA_HOME', envVars.JAVA_HOME ? chalk.dim('.../' + envVars.JAVA_HOME.split('/').slice(-2).join('/')) : 'Not set', !!envVars.JAVA_HOME),
  ];
  box('Environment Variables', '🔧', envLines);

  ui.log.write('');

  // Drivers
  const driverLines =
    drivers.length === 0
      ? [chalk.dim('No drivers installed')]
      : drivers.map(
          (d) => `${CHECK} ${chalk.white(d.name.padEnd(22))} ${chalk.magenta(d.version)}`
        );
  box('Installed Drivers', '🔌', driverLines);

  ui.log.write('');

  // Plugins
  const pluginLines =
    plugins.length === 0
      ? [chalk.dim('No plugins installed')]
      : plugins.map(
          (p) => `${CHECK} ${chalk.white(p.name.padEnd(22))} ${chalk.magenta(p.version)}`
        );
  box('Installed Plugins', '🧩', pluginLines);

  ui.log.write('');

  // Connected Devices
  const deviceLines = [];
  for (const device of androidDevices) {
    const statusColor = device.status === 'device' ? chalk.green : chalk.red;
    deviceLines.push(
      `${CHECK} ${chalk.white(device.model.padEnd(18))} ${chalk.blue('Android')} ${statusColor(device.status)}`
    );
  }
  for (const sim of iosSimulators) {
    deviceLines.push(
      `${CHECK} ${chalk.white(sim.name.padEnd(18))} ${chalk.blue(`iOS ${sim.osVersion}`)} ${chalk.green(sim.state)}`
    );
  }
  if (deviceLines.length === 0) {
    deviceLines.push(chalk.dim('No devices connected'));
  }
  box('Connected Devices', '📱', deviceLines);

  // Summary bar
  const total = 4 + (process.platform === 'darwin' ? 1 : 0) + 2; // system checks + env vars
  let passing = 0;
  if (appiumVersion) passing++;
  passing++; // node always passes
  if (javaVersion) passing++;
  if (process.platform === 'darwin' && xcodeVersion) passing++;
  if (envVars.ANDROID_HOME) passing++;
  if (envVars.JAVA_HOME) passing++;

  const bar = '█'.repeat(passing) + chalk.dim('░'.repeat(total - passing));
  const color = passing === total ? chalk.green : passing >= total - 2 ? chalk.yellow : chalk.red;
  ui.log.write('');
  ui.log.write(color(`  ${bar}  ${passing}/${total} checks passing`));
  ui.log.write('');
}
