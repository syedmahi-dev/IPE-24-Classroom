import fetch, { RequestInit, Response } from 'node-fetch'
import { getConfig } from '../config'
import { logger } from './logger'

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const RETRYABLE_NETWORK_CODES = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
])

interface InternalApiRequestOptions {
  attemptsPerBase?: number
  retryDelayMs?: number
  logScope?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function parseFallbackUrls(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function getBaseUrls(): string[] {
  const config = getConfig()
  const fromEnv = parseFallbackUrls(process.env.INTERNAL_API_FALLBACK_URLS)
  const configured = [config.INTERNAL_API_URL, ...fromEnv].map(normalizeBaseUrl)
  return Array.from(new Set(configured))
}

function getErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const maybeCode = (err as { code?: unknown }).code
  return typeof maybeCode === 'string' ? maybeCode : undefined
}

function isRetryableNetworkError(err: unknown): boolean {
  const code = getErrorCode(err)
  if (code && RETRYABLE_NETWORK_CODES.has(code)) return true
  const msg = String(err)
  return (
    msg.includes('EAI_AGAIN') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT')
  )
}

function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export async function requestInternalApi(
  path: string,
  init: RequestInit,
  options: InternalApiRequestOptions = {}
): Promise<Response> {
  const attemptsPerBase = options.attemptsPerBase ?? 3
  const retryDelayMs = options.retryDelayMs ?? 500
  const logScope = options.logScope ?? 'internal-api'
  const baseUrls = getBaseUrls()

  let lastError: unknown = null

  for (let baseIndex = 0; baseIndex < baseUrls.length; baseIndex++) {
    const baseUrl = baseUrls[baseIndex]
    const url = buildUrl(baseUrl, path)

    for (let attempt = 1; attempt <= attemptsPerBase; attempt++) {
      try {
        const res = await fetch(url, init)

        if (!res.ok && RETRYABLE_STATUS.has(res.status) && attempt < attemptsPerBase) {
          logger.warn(logScope, 'internal API request returned retryable status', {
            path,
            status: res.status,
            baseUrl,
            attempt,
          })
          await sleep(retryDelayMs * attempt)
          continue
        }

        return res
      } catch (err) {
        lastError = err
        const retryable = isRetryableNetworkError(err)
        const hasMoreAttempts = attempt < attemptsPerBase

        if (retryable && hasMoreAttempts) {
          logger.warn(logScope, 'internal API request failed; retrying', {
            path,
            baseUrl,
            attempt,
            error: String(err),
          })
          await sleep(retryDelayMs * attempt)
          continue
        }

        if (retryable && baseIndex < baseUrls.length - 1) {
          logger.warn(logScope, 'internal API request failed on this base URL; trying fallback URL', {
            path,
            baseUrl,
            error: String(err),
          })
          break
        }

        throw err
      }
    }
  }

  throw new Error(`Internal API request failed for ${path}: ${String(lastError)}`)
}