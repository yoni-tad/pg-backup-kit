function timestamp(): string {
  return new Date().toISOString();
}

const color = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function style(text: string, code: string): string {
  return `${code}${text}${color.reset}`;
}

export function info(message: string): void {
  console.log(
    `${style(`[${timestamp()}]`, color.gray)} ${style("INFO ", color.blue)} ${message}`,
  );
}

export function success(message: string): void {
  console.log(
    `${style(`[${timestamp()}]`, color.gray)} ${style("✓", color.green)}     ${message}`,
  );
}

export function warn(message: string): void {
  console.warn(
    `${style(`[${timestamp()}]`, color.gray)} ${style("WARN ", color.yellow)} ${message}`,
  );
}

export function error(message: string): void {
  console.error(
    `${style(`[${timestamp()}]`, color.gray)} ${style("ERROR", color.red)} ${message}`,
  );
}
