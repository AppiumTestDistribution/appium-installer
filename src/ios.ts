// Reference - https://github.com/wswebcreation/start-ios-simulator/blob/master/lib/index.js

import { execFileSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';

const MESSAGE_TYPES = {
  ERROR: 'error',
  NOTIFY: 'notify',
  STEP: 'step',
  WARNING: 'warning',
};

export default async function startiOSSimulator() {
  const simulators = getAllSimulators();
  const questions = [
    {
      type: 'list',
      name: 'simulator',
      message: 'On which simulator do you want to run your test?',
      choices: simulators,
    },
  ];

  logMessage(MESSAGE_TYPES.NOTIFY, 'iOS iPhone|iPad CLI Helper');

  if (simulators.length > 0) {
    const answer = await inquirer.prompt(questions);
    const chosenSimulator = simulators.find(
      (simulator: any) => simulator.name === answer.simulator
    );

    closeBootedSimulator(chosenSimulator);
    bootSimulator(chosenSimulator);
    startSimulator(chosenSimulator);
  }
}

function getAllSimulators() {
  const simulators: any = [];
  const devices = JSON.parse(
    execFileSync('xcrun', ['simctl', 'list', '--json', 'devices'], { encoding: 'utf8' })
  ).devices;
  Object.keys(devices)
    .filter((version) => version.includes('iOS'))
    .forEach((version) =>
      devices[version].map((simulator: any) => {
        if (simulator.isAvailable) {
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

function closeBootedSimulator(chosenSimulator: any) {
  if (chosenSimulator.state === 'Booted') {
    stepMessage(
      MESSAGE_TYPES.WARNING,
      `The ${chosenSimulator.name} is already opened. It will be closed.`
    );
    execFileSync('xcrun', ['simctl', 'shutdown', chosenSimulator.udid], { encoding: 'utf8' });
    stepMessage(MESSAGE_TYPES.STEP, `${chosenSimulator.name} has been shut down.`);
  }
}

function bootSimulator(chosenSimulator: any) {
  execFileSync('xcrun', ['simctl', 'boot', chosenSimulator.udid], { encoding: 'utf8' });
  stepMessage(MESSAGE_TYPES.STEP, `${chosenSimulator.name} wil be booted.`);
}

function startSimulator(chosenSimulator: any) {
  stepMessage(MESSAGE_TYPES.STEP, `${chosenSimulator.name} wil be opened.`);
  execFileSync('open', ['-a', 'Simulator.app'], { encoding: 'utf8' });
}

/**
 * Print the message
 *
 * @param {string} type
 * @param {string} message
 */
function logMessage(type: string, message: string) {
  const messageType = type === MESSAGE_TYPES.NOTIFY ? chalk.cyan : chalk.red;
  console.log(
    messageType(`
====================================================================================================
  
  ${message}
  
====================================================================================================
`)
  );
}

/**
 * Print the step
 *
 * @param {string} type
 * @param {string} stepMessage
 */
function stepMessage(type: string, stepMessage: string) {
  const messageType = type === MESSAGE_TYPES.STEP ? chalk.green : chalk.yellow;

  console.log(messageType(`\n${stepMessage}`));
}
