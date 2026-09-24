export class Logger {
  private static enabled: boolean = false;
  private static readonly PREFIX = '[YT Shield]';

  public static setLogging(enabled: boolean): void {
    this.enabled = enabled;
  }

  public static isLoggingEnabled(): boolean {
    return this.enabled;
  }

  public static debug(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.debug(`${this.PREFIX} [DEBUG]`, message, ...args);
    }
  }

  public static info(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.info(`${this.PREFIX} [INFO]`, message, ...args);
    }
  }

  public static warn(message: string, ...args: unknown[]): void {
    console.warn(`${this.PREFIX} [WARN]`, message, ...args);
  }

  public static error(message: string, ...args: unknown[]): void {
    console.error(`${this.PREFIX} [ERROR]`, message, ...args);
  }
}
