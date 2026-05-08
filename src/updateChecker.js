import shelljs from 'shelljs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Logger from './logger.js';

const ui = new Logger().getInstance();
const CHECK = chalk.green('✔');
const WARN = chalk.yellow('⬆');
const FRESH = chalk.green('●');
const STALE = chalk.yellow('●');

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

function getCurrentAppiumVersion() {
  const result = shelljs.exec('appium -v', { silent: true });
  return result.code === 0 ? result.stdout.trim() : null;
}

function getLatestAppiumVersion() {
  const result = shelljs.exec('npm view appium version', { silent: true });
  return result.code === 0 ? result.stdout.trim() : null;
}

function getDriverUpdateInfo() {
  const result = shelljs.exec('appium driver list --json', { silent: true });
  if (result.code !== 0) return [];
  const parsed = parseAppiumJson(result.stdout);
  if (!parsed) return [];
  const drivers = [];
  for (const [name, info] of Object.entries(parsed)) {
    if (!info.installed) continue;
    drivers.push({
      name,
      currentVersion: info.version || 'unknown',
      latestVersion: info.updateVersion || info.version || 'unknown',
      upToDate: !info.updateVersion || info.updateVersion === info.version,
    });
  }
  return drivers;
}

function getPluginUpdateInfo() {
  const result = shelljs.exec('appium plugin list --json', { silent: true });
  if (result.code !== 0) return [];
  const parsed = parseAppiumJson(result.stdout);
  if (!parsed) return [];
  const plugins = [];
  for (const [name, info] of Object.entries(parsed)) {
    if (!info.installed) continue;
    plugins.push({
      name,
      currentVersion: info.version || 'unknown',
      latestVersion: info.updateVersion || info.version || 'unknown',
      upToDate: !info.updateVersion || info.updateVersion === info.version,
    });
  }
  return plugins;
}

function renderRow(name, current, latest, isUpToDate) {
  const dot = isUpToDate ? FRESH : STALE;
  const statusText = isUpToDate
    ? chalk.green('Up to date')
    : chalk.yellow('Update available');
  const arrow = isUpToDate ? '' : chalk.yellow(' →');
  const latestStr = isUpToDate
    ? chalk.dim(latest)
    : chalk.yellow.bold(latest);

  return `  ${dot} ${chalk.white(name.padEnd(26))} ${chalk.dim(current.padEnd(12))}${arrow} ${latestStr.padEnd(14)} ${statusText}`;
}

export async function checkForUpdates() {
  ui.log.write('');

  const currentAppium = getCurrentAppiumVersion();
  if (!currentAppium) {
    ui.log.write('');
    ui.log.write(chalk.red('  ⛔ Appium Server is not installed.'));
    ui.log.write(chalk.dim('  Use "Install Appium Server" from the main menu first.\n'));
    return;
  }

  const spinner = ora({
    text: chalk.cyan('Checking for updates across all components...'),
    spinner: 'dots12',
  }).start();

  const latestAppium = getLatestAppiumVersion();
  const drivers = getDriverUpdateInfo();
  const plugins = getPluginUpdateInfo();

  spinner.succeed(chalk.green('Update check complete'));

  ui.log.write('');
  ui.log.write(chalk.bold.cyan('  ┌──────────────────────────────────────────────────────────────────────────┐'));
  ui.log.write(chalk.bold.cyan('  │') + chalk.bold.white('                      🔄  Update Status  🔄                               ') + chalk.bold.cyan('│'));
  ui.log.write(chalk.bold.cyan('  └──────────────────────────────────────────────────────────────────────────┘'));
  ui.log.write('');

  ui.log.write(chalk.dim(`  ${'  Component'.padEnd(30)} ${'Current'.padEnd(14)}  ${'Latest'.padEnd(14)} Status`));
  ui.log.write(chalk.dim(`  ${'─'.repeat(76)}`));

  const serverUpToDate = currentAppium === latestAppium;
  ui.log.write(renderRow('Appium Server', currentAppium, latestAppium || 'unknown', serverUpToDate));

  if (drivers.length > 0) {
    ui.log.write(chalk.dim(`  ${'─'.repeat(76)}`));
    ui.log.write(chalk.dim.bold('    Drivers'));
    for (const driver of drivers) {
      ui.log.write(renderRow(driver.name, driver.currentVersion, driver.latestVersion, driver.upToDate));
    }
  }

  if (plugins.length > 0) {
    ui.log.write(chalk.dim(`  ${'─'.repeat(76)}`));
    ui.log.write(chalk.dim.bold('    Plugins'));
    for (const plugin of plugins) {
      ui.log.write(renderRow(plugin.name, plugin.currentVersion, plugin.latestVersion, plugin.upToDate));
    }
  }

  ui.log.write(chalk.dim(`  ${'─'.repeat(76)}`));

  if (drivers.length === 0 && plugins.length === 0) {
    ui.log.write(chalk.dim('\n  No drivers or plugins installed.'));
  }

  const outdatedDrivers = drivers.filter((d) => !d.upToDate);
  const outdatedPlugins = plugins.filter((p) => !p.upToDate);
  const outdatedCount = outdatedDrivers.length + outdatedPlugins.length + (serverUpToDate ? 0 : 1);
  const totalCount = 1 + drivers.length + plugins.length;
  const upToDateCount = totalCount - outdatedCount;

  ui.log.write('');
  if (outdatedCount > 0) {
    ui.log.write(chalk.yellow(`  ⚠  ${outdatedCount} component(s) can be updated  │  ${chalk.green(`${upToDateCount} up to date`)}`));
    ui.log.write('');

    const { shouldUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldUpdate',
        message: `Update all ${outdatedCount} outdated component(s)?`,
        default: true,
      },
    ]);

    if (shouldUpdate) {
      ui.log.write('');
      if (!serverUpToDate) {
        const serverSpinner = ora({ text: '📦 Updating Appium Server...', spinner: 'dots12' }).start();
        const result = shelljs.exec('npm install -g appium@latest', { silent: true });
        result.code === 0
          ? serverSpinner.succeed(chalk.green('📦 Appium Server updated'))
          : serverSpinner.fail(chalk.red('📦 Failed to update Appium Server'));
      }

      for (const driver of outdatedDrivers) {
        const driverSpinner = ora({ text: `🔌 Updating ${driver.name}...`, spinner: 'dots12' }).start();
        const result = shelljs.exec(`appium driver update ${driver.name}`, { silent: true });
        result.code === 0
          ? driverSpinner.succeed(chalk.green(`🔌 ${driver.name} updated to latest`))
          : driverSpinner.fail(chalk.red(`🔌 Failed to update ${driver.name}`));
      }

      for (const plugin of outdatedPlugins) {
        const pluginSpinner = ora({ text: `🧩 Updating ${plugin.name}...`, spinner: 'dots12' }).start();
        const result = shelljs.exec(`appium plugin update ${plugin.name}`, { silent: true });
        result.code === 0
          ? pluginSpinner.succeed(chalk.green(`🧩 ${plugin.name} updated to latest`))
          : pluginSpinner.fail(chalk.red(`🧩 Failed to update ${plugin.name}`));
      }

      ui.log.write(chalk.green.bold('\n  🎉 All updates completed!\n'));
    }
  } else {
    ui.log.write(chalk.green.bold('  ✨ Everything is up to date! You\'re running the latest.\n'));
  }
}
