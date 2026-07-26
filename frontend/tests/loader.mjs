export function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !specifier.endsWith('.js') && !specifier.endsWith('.mjs') && !specifier.endsWith('.cjs') && !specifier.endsWith('.ts') && !specifier.endsWith('.json') && !specifier.endsWith('/')) {
    try { return next(specifier + '.js', context) }
    catch { return next(specifier, context) }
  }
  return next(specifier, context)
}
