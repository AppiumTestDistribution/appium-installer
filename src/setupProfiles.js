import shelljs from 'shelljs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import path from 'path';
import { installAppiumServerWithVersion } from './serverInstall.js';
import { androidSetup } from './emulators.js';
import { iOSSetup } from './ios.js';
import Logger from './logger.js';

const ui = new Logger().getInstance();
const CHECK = chalk.green('✔');
const CROSS = chalk.red('✘');
const SKIP = chalk.yellow('⊘');

async function runStep(stepName, stepFn, stepNum, totalSteps) {
  const prefix = chalk.dim(`[${stepNum}/${totalSteps}]`);
  const spinner = ora({
    text: `${prefix} ${stepName}`,
    spinner: 'dots12',
  }).start();
  try {
    await stepFn();
    spinner.succeed(`${prefix} ${chalk.green(stepName)}`);
    return { name: stepName, success: true };
  } catch (err) {
    spinner.fail(`${prefix} ${chalk.red(stepName)} ${chalk.dim('— ' + (err.message || err))}`);
    return { name: stepName, success: false, error: err.message || err };
  }
}

async function installServer() {
  await installAppiumServerWithVersion('latest');
}

async function installDriver(driverName) {
  const result = shelljs.exec(`appium driver install ${driverName}`, { silent: true });
  if (result.code !== 0) {
    if (result.stderr && result.stderr.includes('is already installed')) {
      return;
    }
    if (result.stdout && result.stdout.includes('is already installed')) {
      return;
    }
    throw new Error(`Failed to install driver ${driverName}`);
  }
}

async function runDoctor(platform) {
  const doctorPath = path.join(__dirname, '..', 'node_modules', '.bin', 'appium-doctor');
  shelljs.exec(`${doctorPath} --${platform}`);
}

async function androidProfile() {
  const total = 4;
  const results = [];
  let step = 1;

  results.push(await runStep('Installing Appium Server (latest)', installServer, step++, total));
  results.push(
    await runStep('Installing UiAutomator2 driver', () => installDriver('uiautomator2'), step++, total)
  );

  ui.log.write(chalk.bold(`\n  ${chalk.dim(`[${step}/${total}]`)} Setting up Android environment...\n`));
  try {
    await androidSetup();
    results.push({ name: 'Android environment setup', success: true });
  } catch (err) {
    results.push({ name: 'Android environment setup', success: false, error: err.message });
  }
  step++;

  ui.log.write(chalk.bold(`\n  ${chalk.dim(`[${step}/${total}]`)} Running Appium Doctor...\n`));
  try {
    await runDoctor('android');
    results.push({ name: 'Appium Doctor (Android)', success: true });
  } catch (err) {
    results.push({ name: 'Appium Doctor (Android)', success: false, error: err.message });
  }

  return results;
}

async function iosProfile() {
  if (process.platform !== 'darwin') {
    ui.log.write(chalk.red('\n  ⛔ iOS setup is only available on macOS.\n'));
    return [];
  }

  const total = 4;
  const results = [];
  let step = 1;

  results.push(await runStep('Installing Appium Server (latest)', installServer, step++, total));
  results.push(await runStep('Installing XCUITest driver', () => installDriver('xcuitest'), step++, total));

  ui.log.write(chalk.bold(`\n  ${chalk.dim(`[${step}/${total}]`)} Setting up iOS environment...\n`));
  try {
    await iOSSetup();
    results.push({ name: 'iOS environment setup', success: true });
  } catch (err) {
    results.push({ name: 'iOS environment setup', success: false, error: err.message });
  }
  step++;

  ui.log.write(chalk.bold(`\n  ${chalk.dim(`[${step}/${total}]`)} Running Appium Doctor...\n`));
  try {
    await runDoctor('ios');
    results.push({ name: 'Appium Doctor (iOS)', success: true });
  } catch (err) {
    results.push({ name: 'Appium Doctor (iOS)', success: false, error: err.message });
  }

  return results;
}

async function fullMobileProfile() {
  const isMac = process.platform === 'darwin';
  const total = isMac ? 7 : 4;
  const results = [];
  let step = 1;

  results.push(await runStep('Installing Appium Server (latest)', installServer, step++, total));
  results.push(
    await runStep('Installing UiAutomator2 driver', () => installDriver('uiautomator2'), step++, total)
  );

  if (isMac) {
    results.push(await runStep('Installing XCUITest driver', () => installDriver('xcuitest'), step++, total));
  } else {
    ui.log.write(chalk.yellow(`  ${SKIP} Skipping XCUITest driver (macOS only)\n`));
  }

  ui.log.write(chalk.bold(`\n  ${chalk.dim(`[${step}/${total}]`)} Setting up Android environment...\n`));
  try {
    await androidSetup();
    results.push({ name: 'Android environment setup', success: true });
  } catch (err) {
    results.push({ name: 'Android environment setup', success: false, error: err.message });
  }
  step++;

  if (isMac) {
    ui.log.write(chalk.bold(`\n  ${chalk.dim(`[${step}/${total}]`)} Setting up iOS environment...\n`));
    try {
      await iOSSetup();
      results.push({ name: 'iOS environment setup', success: true });
    } catch (err) {
      results.push({ name: 'iOS environment setup', success: false, error: err.message });
    }
    step++;
  }

  ui.log.write(chalk.bold(`\n  ${chalk.dim(`[${step}/${total}]`)} Running Appium Doctor...\n`));
  try {
    await runDoctor('android');
    results.push({ name: 'Appium Doctor (Android)', success: true });
  } catch (err) {
    results.push({ name: 'Appium Doctor (Android)', success: false, error: err.message });
  }
  step++;

  if (isMac) {
    try {
      await runDoctor('ios');
      results.push({ name: 'Appium Doctor (iOS)', success: true });
    } catch (err) {
      results.push({ name: 'Appium Doctor (iOS)', success: false, error: err.message });
    }
  }

  return results;
}

async function webOnMobileProfile() {
  const total = 3;
  const results = [];
  let step = 1;

  results.push(await runStep('Installing Appium Server (latest)', installServer, step++, total));
  results.push(await runStep('Installing Chromium driver', () => installDriver('chromium'), step++, total));
  results.push(await runStep('Installing Gecko driver', () => installDriver('gecko'), step++, total));

  return results;
}

function showSummary(results) {
  if (results.length === 0) return;

  const passed = results.filter((r) => r.success).length;
  const total = results.length;
  const allPassed = passed === total;

  ui.log.write('');
  ui.log.write(chalk.bold.yellow('  ┌──────────────────────────────────────────────────────┐'));
  ui.log.write(chalk.bold.yellow('  │') + chalk.bold.white('              ⚡  Setup Summary  ⚡                    ') + chalk.bold.yellow('│'));
  ui.log.write(chalk.bold.yellow('  └──────────────────────────────────────────────────────┘'));
  ui.log.write('');

  for (const step of results) {
    if (step.success) {
      ui.log.write(`  ${CHECK} ${chalk.white(step.name)}`);
    } else {
      ui.log.write(`  ${CROSS} ${chalk.white(step.name)}`);
      if (step.error) {
        ui.log.write(`    ${chalk.dim('↳ ' + step.error)}`);
      }
    }
  }

  // Progress bar
  const barLength = 30;
  const filled = Math.round((passed / total) * barLength);
  const empty = barLength - filled;
  const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  const pct = Math.round((passed / total) * 100);
  const color = allPassed ? chalk.green : chalk.yellow;

  ui.log.write('');
  ui.log.write(`  ${bar}  ${color.bold(`${pct}%`)}  ${chalk.dim(`(${passed}/${total} steps)`)}`);

  if (allPassed) {
    ui.log.write(chalk.green.bold('\n  🎉 Setup complete! You\'re ready to test.\n'));
  } else {
    ui.log.write(chalk.yellow(`\n  ⚠  ${total - passed} step(s) need attention. Check the errors above.\n`));
  }
}

const PROFILES = [
  {
    name: `${chalk.green('🤖')} Android Testing`,
    description: 'Server + UiAutomator2 + Environment + Doctor',
    fn: androidProfile,
    value: 'android',
  },
  {
    name: `${chalk.white('🍎')} iOS Testing`,
    description: 'Server + XCUITest + Environment + Doctor',
    fn: iosProfile,
    value: 'ios',
  },
  {
    name: `${chalk.magenta('📱')} Full Mobile Testing`,
    description: 'Android + iOS — the complete package',
    fn: fullMobileProfile,
    value: 'full',
  },
  {
    name: `${chalk.blue('🌐')} Web on Mobile`,
    description: 'Server + Chromium + Gecko drivers',
    fn: webOnMobileProfile,
    value: 'web',
  },
];

export async function runSetupProfile() {
  ui.log.write('');
  ui.log.write(chalk.bold.yellow('  ┌──────────────────────────────────────────────────────┐'));
  ui.log.write(chalk.bold.yellow('  │') + chalk.bold.white('            ⚡  Quick Setup Profiles  ⚡               ') + chalk.bold.yellow('│'));
  ui.log.write(chalk.bold.yellow('  └──────────────────────────────────────────────────────┘'));
  ui.log.write('');
  ui.log.write(chalk.dim('  Pick a profile and we\'ll install everything you need.\n'));

  const { selectedProfile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedProfile',
      message: chalk.bold.white('Choose your profile'),
      choices: PROFILES.map((p) => ({
        name: `${p.name}  ${chalk.dim('—')} ${chalk.dim(p.description)}`,
        value: p.value,
      })),
    },
  ]);

  const profile = PROFILES.find((p) => p.value === selectedProfile);
  ui.log.write('');
  const results = await profile.fn();
  showSummary(results);
}
