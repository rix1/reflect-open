// The style names a heading-weight face goes by: the font's own bold, or
// anything heavier.
const HEAVY_STYLES = ['Bold', 'Semibold', 'SemiBold', 'Extrabold', 'ExtraBold', 'Heavy', 'Black']

/**
 * Whether `family` has a face of its own heavy enough for a heading, looked
 * up by name among the installed fonts (`local()`). Without one, a bold
 * weight is synthesized from the regular face, which WebKit does so faintly
 * that a heading barely differs from the text. Tries the full name
 * ("Dank Mono Bold") and the PostScript name ("DankMono-Bold") of each style.
 *
 * A variable font whose heavy instances have no name of their own reads as
 * having none. Outside a browser (no `FontFace`) it assumes there is one.
 */
export async function fontHasHeavyFace(family: string): Promise<boolean> {
  if (typeof FontFace === 'undefined') {
    return true
  }
  const name = family.replaceAll(/["\\]/g, '').trim()
  const compact = name.replaceAll(' ', '')
  const candidates = HEAVY_STYLES.flatMap((style) => [`${name} ${style}`, `${compact}-${style}`])
  const found = await Promise.all(
    candidates.map((candidate) => {
      return new FontFace('reflect-focus-weight-probe', `local("${candidate}")`).load().then(
        () => true,
        () => false,
      )
    }),
  )
  return found.includes(true)
}
