import chalk from 'chalk';

export class Logger {
  static info(...args: any[]) {
    console.log(chalk.blue('[INFO]'), ...args);
  }

  static success(...args: any[]) {
    console.log(chalk.green('[SUCCESS]'), ...args);
  }

  static warn(...args: any[]) {
    console.log(chalk.yellow('[WARN]'), ...args);
  }

  static error(...args: any[]) {
    console.error(chalk.red('[ERROR]'), ...args);
  }

  static debug(...args: any[]) {
    if (process.env.DEBUG) {
      console.log(chalk.gray('[DEBUG]'), ...args);
    }
  }
}

export default Logger;