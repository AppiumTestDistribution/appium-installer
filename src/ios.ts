import { execFileSync, exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export function getAllSimulators() {
  const simulators: any = [];
  const devices = JSON.parse(
    execFileSync('xcrun', ['simctl', 'list', '--json', 'devices'], { encoding: 'utf8' })
  ).devices;
  Object.keys(devices)
    .filter((version) => version.includes('iOS'))
    .forEach((version) =>
      devices[version].map((simulator: any) => {
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

export async function launchSimulator(simulator: any) {
  await execAsync(`xcrun simctl boot ${simulator}`);
  await execAsync(`open -a Simulator.app`);
}
