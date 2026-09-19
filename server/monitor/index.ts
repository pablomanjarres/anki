import { checkAndAlert } from './check.ts';

try {
  console.log(checkAndAlert() ?? 'Anki generation run is current or not due yet');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
