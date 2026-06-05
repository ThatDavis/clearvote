// Fail-fast validation for required environment variables
// Imported early in the application lifecycle

const required = ['AUTH_SECRET', 'DATABASE_URL']

const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
    `These must be set before the application starts.`
  )
}

export {}
