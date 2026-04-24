type Level = 'info' | 'warn' | 'error'

function log(level: Level, context: string, message: string, meta?: object) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'discord-listener',
    context,
    message,
    ...meta,
  })
  if (level === 'error') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

export const logger = {
  info:  (ctx: string, msg: string, meta?: object) => log('info',  ctx, msg, meta),
  warn:  (ctx: string, msg: string, meta?: object) => log('warn',  ctx, msg, meta),
  error: (ctx: string, msg: string, meta?: object) => log('error', ctx, msg, meta),
}
