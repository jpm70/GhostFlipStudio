import type { ViewerContext } from './context';
import { ghostflipHash, PASSWORD_ITERATIONS } from './password';

/** Script de acceso por contraseña (vacío si no hay contraseña). */
export function buildPasswordGate(ctx: ViewerContext): string {
  const { hasPassword, passwordSalt, passwordHash } = ctx;
  return `  ${
    hasPassword
      ? `<script>
    (function() {
      var expectedHash = ${JSON.stringify(passwordHash)};
      ${ghostflipHash.toString().replace(/<\/script/gi, '<\\/script')}
      var SALT = ${JSON.stringify(passwordSalt)};
      var ITER = ${PASSWORD_ITERATIONS};
      var hashInput = function (pw) { return ghostflipHash(pw, SALT, ITER); };
      window.__ghostflipCheckAccess = function() {
        var attempt = window.prompt('Introduce la contraseña:');
        if (attempt !== null && hashInput(attempt) === expectedHash) {
          window.__ghostflipUnlocked = true;
          var root = document.getElementById('viewer-root');
          var lock = document.getElementById('lock-screen');
          if (root) root.style.display = 'flex';
          if (lock) lock.style.display = 'none';
          return true;
        }
        return false;
      };
      window.__ghostflipUnlocked = false;
      var firstAttempt = window.prompt('Introduce la contraseña:');
      if (firstAttempt !== null && hashInput(firstAttempt) === expectedHash) {
        window.__ghostflipUnlocked = true;
      }
    })();
  <\/script>`
      : ''
  }

`;
}
