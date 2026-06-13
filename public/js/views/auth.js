/* Aliester - Auth Views (Login, Register, Verify Email) */

// Local escape (avoids dependency on asistente.js)
function _esc(str) {
  if (!str) return '';
  var d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

var AuthView = {
  currentMode: 'login', // 'login' | 'register' | 'verify'
  pendingEmail: null,
  error: null,
  success: null,
  loading: false,
};

function showAuthScreen() {
  var appShell = document.querySelector('.app');
  var authScreen = document.getElementById('auth-screen');
  var authLoading = document.getElementById('auth-loading');

  if (appShell) appShell.style.display = 'none';
  if (authLoading) authLoading.style.display = 'none';
  if (authScreen) {
    authScreen.style.display = 'flex';
    renderLoginForm();
  }
}

function showAppShell(user) {
  var appShell = document.querySelector('.app');
  var authScreen = document.getElementById('auth-screen');
  var authLoading = document.getElementById('auth-loading');

  if (authScreen) authScreen.style.display = 'none';
  if (authLoading) authLoading.style.display = 'none';
  if (appShell) appShell.style.display = 'flex';

  updateSidebarFooter(user);
}

function updateSidebarFooter(user) {
  var footer = document.getElementById('sidebar-footer');
  if (!footer || !user) return;

  var displayName = user.name || user.profile?.name || '';
  var email = user.email || '';
  var name = displayName || email.split('@')[0];
  var initials = name.substring(0, 2).toUpperCase();

  footer.innerHTML =
    '<div class="sidebar-user">' +
      '<div class="sidebar-avatar">' + _esc(initials) + '</div>' +
      '<div class="sidebar-user-info">' +
        '<div class="sidebar-user-name">' + _esc(name) + '</div>' +
        '<div class="sidebar-user-role">' + _esc(email) + '</div>' +
      '</div>' +
      '<button class="sidebar-logout-btn" onclick="handleLogout()" title="Cerrar sesion">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
          '<polyline points="16 17 21 12 16 7"/>' +
          '<line x1="21" y1="12" x2="9" y2="12"/>' +
        '</svg>' +
      '</button>' +
    '</div>';
}

/* ── Login Form ─────────────────────────────────── */

function renderLoginForm() {
  AuthView.currentMode = 'login';
  AuthView.error = null;
  AuthView.success = null;

  var authScreen = document.getElementById('auth-screen');
  authScreen.innerHTML =
    '<div class="auth-card">' +
      '<div class="auth-header">' +
        '<div class="auth-logo">A</div>' +
        '<h1 class="auth-title">Iniciar sesion</h1>' +
        '<p class="auth-subtitle">Ingresa a tu cuenta de Aliester</p>' +
      '</div>' +
      '<form class="auth-form" onsubmit="handleLoginSubmit(event)">' +
        '<div id="auth-error" class="auth-error" style="display:none"></div>' +
        '<div class="input-group">' +
          '<label class="input-label" for="auth-email">Correo electronico</label>' +
          '<input class="input" type="email" id="auth-email" placeholder="tu@correo.com" required autocomplete="email">' +
        '</div>' +
        '<div class="input-group">' +
          '<label class="input-label" for="auth-password">Contrasena</label>' +
          '<input class="input" type="password" id="auth-password" placeholder="Tu contrasena" required autocomplete="current-password">' +
        '</div>' +
        '<button class="btn btn-primary" type="submit" id="auth-submit">' +
          'Iniciar sesion' +
        '</button>' +
      '</form>' +
      '<div class="auth-divider">o</div>' +
      '<div class="auth-google-btn" title="Proximamente">' +
        '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>' +
        'Continuar con Google (proximamente)' +
      '</div>' +
      '<div class="auth-footer">' +
        'No tienes cuenta? <a onclick="renderRegisterForm()">Crear cuenta</a>' +
      '</div>' +
    '</div>';
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  var email = document.getElementById('auth-email').value.trim();
  var password = document.getElementById('auth-password').value;
  var submitBtn = document.getElementById('auth-submit');
  var errorEl = document.getElementById('auth-error');

  if (errorEl) errorEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Iniciando sesion...';

  try {
    var result = await window.insforge.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (result.error) {
      showAuthError(mapAuthError(result.error));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar sesion';
      return;
    }

    // Success
    window.currentUser = result.data.user;
    onAuthSuccess(result.data.user);
  } catch (err) {
    showAuthError('Error de conexion. Intenta de nuevo.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Iniciar sesion';
  }
}

/* ── Register Form ──────────────────────────────── */

function renderRegisterForm() {
  AuthView.currentMode = 'register';
  AuthView.error = null;
  AuthView.success = null;

  var authScreen = document.getElementById('auth-screen');
  authScreen.innerHTML =
    '<div class="auth-card">' +
      '<div class="auth-header">' +
        '<div class="auth-logo">A</div>' +
        '<h1 class="auth-title">Crear cuenta</h1>' +
        '<p class="auth-subtitle">Registrate para empezar a usar Aliester</p>' +
      '</div>' +
      '<form class="auth-form" onsubmit="handleRegisterSubmit(event)">' +
        '<div id="auth-error" class="auth-error" style="display:none"></div>' +
        '<div class="input-group">' +
          '<label class="input-label" for="auth-name">Nombre</label>' +
          '<input class="input" type="text" id="auth-name" placeholder="Tu nombre" required autocomplete="name">' +
        '</div>' +
        '<div class="input-group">' +
          '<label class="input-label" for="auth-email">Correo electronico</label>' +
          '<input class="input" type="email" id="auth-email" placeholder="tu@correo.com" required autocomplete="email">' +
        '</div>' +
        '<div class="input-group">' +
          '<label class="input-label" for="auth-password">Contrasena</label>' +
          '<input class="input" type="password" id="auth-password" placeholder="Minimo 6 caracteres" required minlength="6" autocomplete="new-password">' +
        '</div>' +
        '<div class="input-group">' +
          '<label class="input-label" for="auth-password-confirm">Confirmar contrasena</label>' +
          '<input class="input" type="password" id="auth-password-confirm" placeholder="Repite tu contrasena" required autocomplete="new-password">' +
        '</div>' +
        '<button class="btn btn-primary" type="submit" id="auth-submit">' +
          'Crear cuenta' +
        '</button>' +
      '</form>' +
      '<div class="auth-footer">' +
        'Ya tienes cuenta? <a onclick="renderLoginForm()">Iniciar sesion</a>' +
      '</div>' +
    '</div>';
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  var name = document.getElementById('auth-name').value.trim();
  var email = document.getElementById('auth-email').value.trim();
  var password = document.getElementById('auth-password').value;
  var confirm = document.getElementById('auth-password-confirm').value;
  var submitBtn = document.getElementById('auth-submit');
  var errorEl = document.getElementById('auth-error');

  if (errorEl) errorEl.style.display = 'none';

  if (password !== confirm) {
    showAuthError('Las contrasenas no coinciden.');
    return;
  }

  if (password.length < 6) {
    showAuthError('La contrasena debe tener al menos 6 caracteres.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando cuenta...';

  try {
    var result = await window.insforge.auth.signUp({
      email: email,
      password: password,
      name: name,
      redirectTo: window.location.origin + window.location.pathname,
    });

    if (result.error) {
      showAuthError(mapAuthError(result.error));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear cuenta';
      return;
    }

    if (result.data?.requireEmailVerification) {
      // Show verify code form
      AuthView.pendingEmail = email;
      renderVerifyForm(email);
      return;
    }

    if (result.data?.accessToken) {
      // No verification needed — already signed in
      window.currentUser = result.data.user;
      onAuthSuccess(result.data.user);
      return;
    }

    // Fallback: unexpected response
    showAuthError('Respuesta inesperada del servidor. Intenta iniciar sesion.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear cuenta';
  } catch (err) {
    showAuthError('Error de conexion. Intenta de nuevo.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear cuenta';
  }
}

/* ── Verify Email Form ──────────────────────────── */

function renderVerifyForm(email) {
  AuthView.currentMode = 'verify';
  AuthView.error = null;

  var authScreen = document.getElementById('auth-screen');
  authScreen.innerHTML =
    '<div class="auth-card">' +
      '<div class="auth-header">' +
        '<div class="auth-logo">A</div>' +
        '<h1 class="auth-title">Verifica tu correo</h1>' +
        '<p class="auth-subtitle">Ingresa el codigo de 6 digitos que enviamos a <strong>' + _esc(email) + '</strong></p>' +
      '</div>' +
      '<form class="auth-form" onsubmit="handleVerifySubmit(event)">' +
        '<div id="auth-error" class="auth-error" style="display:none"></div>' +
        '<div id="auth-success" class="auth-success" style="display:none"></div>' +
        '<div class="auth-code-input">' +
          '<input class="input" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" data-code-idx="0" autofocus>' +
          '<input class="input" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" data-code-idx="1">' +
          '<input class="input" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" data-code-idx="2">' +
          '<input class="input" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" data-code-idx="3">' +
          '<input class="input" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" data-code-idx="4">' +
          '<input class="input" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" data-code-idx="5">' +
        '</div>' +
        '<button class="btn btn-primary" type="submit" id="auth-submit">' +
          'Verificar' +
        '</button>' +
      '</form>' +
      '<div class="auth-resend">' +
        'No recibiste el codigo? <a onclick="handleResendCode()">Reenviar</a>' +
      '</div>' +
      '<div class="auth-footer">' +
        '<a onclick="renderLoginForm()">Volver al inicio de sesion</a>' +
      '</div>' +
    '</div>';

  // Auto-focus and auto-advance for code inputs
  var codeInputs = authScreen.querySelectorAll('[data-code-idx]');
  codeInputs.forEach(function (input, idx) {
    input.addEventListener('input', function () {
      // Only allow digits
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value && idx < codeInputs.length - 1) {
        codeInputs[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !this.value && idx > 0) {
        codeInputs[idx - 1].focus();
      }
    });
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      for (var i = 0; i < Math.min(pasted.length, codeInputs.length); i++) {
        codeInputs[i].value = pasted[i];
      }
      var focusIdx = Math.min(pasted.length, codeInputs.length - 1);
      codeInputs[focusIdx].focus();
    });
  });

  if (codeInputs.length > 0) codeInputs[0].focus();
}

function getCodeValue() {
  var inputs = document.querySelectorAll('[data-code-idx]');
  var code = '';
  inputs.forEach(function (input) {
    code += input.value;
  });
  return code;
}

async function handleVerifySubmit(e) {
  e.preventDefault();
  var otp = getCodeValue();
  var email = AuthView.pendingEmail;
  var submitBtn = document.getElementById('auth-submit');
  var errorEl = document.getElementById('auth-error');
  var successEl = document.getElementById('auth-success');

  if (errorEl) errorEl.style.display = 'none';
  if (successEl) successEl.style.display = 'none';

  if (otp.length !== 6) {
    showAuthError('Ingresa el codigo completo de 6 digitos.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Verificando...';

  try {
    var result = await window.insforge.auth.verifyEmail({
      email: email,
      otp: otp,
    });

    if (result.error) {
      showAuthError(mapAuthError(result.error));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verificar';
      return;
    }

    // verifyEmail auto-signs in on success
    window.currentUser = result.data.user;
    onAuthSuccess(result.data.user);
  } catch (err) {
    showAuthError('Error de conexion. Intenta de nuevo.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Verificar';
  }
}

async function handleResendCode() {
  var email = AuthView.pendingEmail;
  if (!email) return;

  var successEl = document.getElementById('auth-success');
  var errorEl = document.getElementById('auth-error');
  if (errorEl) errorEl.style.display = 'none';

  try {
    await window.insforge.auth.resendVerificationEmail({
      email: email,
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (successEl) {
      successEl.textContent = 'Codigo reenviado. Revisa tu correo.';
      successEl.style.display = 'block';
    }
  } catch (err) {
    showAuthError('No se pudo reenviar el codigo. Intenta mas tarde.');
  }
}

/* ── Logout ─────────────────────────────────────── */

async function handleLogout() {
  try {
    await window.insforge.auth.signOut();
  } catch (err) {
    // Proceed with local logout even if server call fails
    console.warn('Server signOut error:', err);
  }

  window.currentUser = null;
  // Reset app state
  var appContent = document.getElementById('app-content');
  if (appContent) appContent.innerHTML = '';
  window.location.hash = '';

  showAuthScreen();
}

/* ── Auth Success Callback ──────────────────────── */

function onAuthSuccess(user) {
  showAppShell(user);
  // Initialize router after auth
  if (typeof Router !== 'undefined') {
    Router.init();
  }
}

/* ── Helpers ────────────────────────────────────── */

function showAuthError(msg) {
  var errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

function mapAuthError(error) {
  if (!error) return 'Error desconocido.';

  var msg = error.message || '';
  var code = error.statusCode || error.code || 0;

  if (code === 401 || code === 403) {
    return 'Correo o contrasena incorrectos.';
  }
  if (code === 400) {
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
      return 'Este correo ya esta registrado.';
    }
    if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('otp')) {
      return 'Codigo invalido o expirado.';
    }
    return msg || 'Datos invalidos. Verifica los campos.';
  }
  if (code === 429) {
    return 'Demasiados intentos. Espera un momento.';
  }
  if (code >= 500) {
    return 'Error del servidor. Intenta mas tarde.';
  }

  return msg || 'Ocurrio un error. Intenta de nuevo.';
}
