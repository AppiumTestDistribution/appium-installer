import { execFileSync, exec, execSync } from 'child_process';
import util from 'util';
import { IosSetup, getPlatformName } from '@nightwatch/mobile-helper';
import Logger from './logger.js';
import chalk from 'chalk';
import shelljs from 'shelljs'
const ui = new Logger().getInstance();

const execAsync = util.promisify(exec);

export function getAllSimulators() {
  const simulators = [];
  const devices = JSON.parse(
    execFileSync('xcrun', ['simctl', 'list', '--json', 'devices'], { encoding: 'utf8' })
  ).devices;
  Object.keys(devices)
    .filter((version) => version.includes('iOS'))
    .forEach((version) =>
      devices[version].map((simulator) => {
        if (simulator.isAvailable && simulator.state === 'Shutdown') {
          simulators.push({
            ...simulator,
            name: `${simulator.name} ${version.split('-')[1]}.${version.split('-')[2]}`,
            version: version.split(' ')[1],
          });
        }
      })
    );
  return simulators;
}

export async function launchSimulator(simulator) {
  await execAsync(`xcrun simctl boot ${simulator}`);
  await execAsync(`open -a Simulator.app`);
}

export const symbols = () => {
  let ok = String.fromCharCode(10004);
  let fail = String.fromCharCode(10006);

  if (process.platform === 'win32') {
    ok = '\u221A';
    fail = '\u00D7';
  }

  return {
    ok: ok,
    fail: fail
  };
};

export async function iOSSetup() {
  const options = {
    install: false,
    setup: false,
    i: false,
    help: false,
    h: false,
    appium: false
  }
  const iOSSetup = new IosSetup(options);
  if (getPlatformName() != 'mac') {
    ui.log.write('Only macOS is supported');
    return false;
  }
  const setupConfigs = await iOSSetup.getSetupConfigs(options);
  const missingRequirements = verifySetup(setupConfigs);
  await iOSSetup.setupIos(setupConfigs, missingRequirements);
  ui.log.write('\n');
}

function verifySetup(setupConfigs) {
  const missingRequirements = [];

  if (setupConfigs.mode === 'simulator' || setupConfigs.mode === 'both') {
    console.log('\nVerifying the setup requirements for simulators ...');

    try {
      execSync('/usr/bin/xcodebuild -version', {
        stdio: 'pipe'
      });
      console.log(`  ${chalk.green(symbols().ok)} Xcode is installed in your machine\n`);
    } catch (error) {
      console.log(`  ${chalk.red(symbols().fail)} Xcode is not installed.`);
      missingRequirements.push('Xcode is not installed');
    }
    const simulators = getAllSimulators();

    if (simulators.length === 0) {
      console.log(`  ${chalk.red(symbols().fail)} No valid simulators avaiable.`);
      missingRequirements.push('No valid simulators avaiable');
    }
  }

  if (setupConfigs.mode === 'real' || setupConfigs.mode === 'both') {
    console.log('\nVerifying the setup requirements for real devices...');

    try {
      // eslint-disable-next-line
      const stdout = execSync("system_profiler SPUSBDataType | sed -n '/iPhone/,/Serial/p' | grep 'Serial Number:' | awk -F ': ' '{print $2}'", {
        stdio: 'pipe'
      });

      if (stdout.toString() == '') {
        console.log(`  ${chalk.red(symbols().fail)} Device is either not connected or turned off.`);
        missingRequirements.push('Device is not connected');
      }
    } catch (error) {
      console.log(error)
    }
  }

  if (missingRequirements.length === 0) {

    console.log('\nGreat! All the requirements are being met.');

    if (setupConfigs.mode === 'real') {
      console.log('✅ You can go ahead and run your tests now on your iOS device.');
    } else if (setupConfigs.mode === 'simulator') {
      console.log('✅ You can go ahead and run your tests now on an iOS simulator.');
    } else {
      console.log('✅ You can go ahead and run your tests now on an iOS device/simulator.');
    }
  }

  return missingRequirements;
}
