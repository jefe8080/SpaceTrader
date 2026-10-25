// Bump when client state requires new server fields. Static files can otherwise
// come from disk while an older Node process still runs the server modules.
export const GAME_PROTOCOL = 7;

export function serverVersionError(protocol) {
  return protocol === GAME_PROTOCOL ? null
    : 'Spieloberfläche und Server passen nicht zusammen. Bitte den Spielserver neu starten und diese Seite neu laden.';
}
