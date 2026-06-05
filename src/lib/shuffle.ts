// Deterministic shuffle using a simple seeded random
// Same seed always produces same shuffle order (reproducible results)
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }

  for (let i = result.length - 1; i > 0; i--) {
    hash = (hash * 16807 + 0) % 2147483647
    const j = Math.abs(hash) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}
