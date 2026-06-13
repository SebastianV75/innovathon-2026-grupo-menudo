/* Aliester - Main App & Router */

// --- Settings State ---
let notificationsEnabled = true;
let currentCurrency = 'MXN';
let currentFontSize = 'normal';

// Exchange rates (base: MXN)
const exchangeRates = {
  MXN: 1,
  USD: 0.058,
  EUR: 0.053
};

// Simple Router
const Router = {
  routes: {},
  current: null,
  _initialized: false,

  register(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path) {
    window.location.hash = path;
  },

  init() {
    if (this._initialized) {
      this.resolve();
      return;
    }
    this._initialized = true;
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },

  resolve() {
    const path = window.location.hash.slice(1) || '/';
    const handler = this.routes[path];
    if (handler) {
      this.current = path;
      handler();
      this.updateSidebar(path);
      this.updateBreadcrumb(path);
    }
  },

  updateSidebar(path) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const route = item.getAttribute('data-route');
      item.classList.toggle('active', route === path);
    });
  },

  updateBreadcrumb(path) {
    const names = {
      '/': 'Dashboard',
      '/asistente': 'Asistente',
      '/cuentas': 'Cuentas',
      '/finanzas': 'Finanzas',
      '/proyectos': 'Proyectos',
      '/calendario': 'Calendario',
      '/notas': 'Notas',
      '/suscripciones': 'Suscripciones'
    };
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = `
      <a href="#/" class="navbar-breadcrumb-link">Aliester</a>
      <span class="navbar-breadcrumb-sep">/</span>
      <span class="navbar-breadcrumb-current">${names[path] || 'Dashboard'}</span>
    `;
  }
};

// Render helper
function render(html) {
  document.getElementById('app-content').innerHTML = html;
}

// Modal
function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml || '';
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// Toast
function showToast(message, type = 'success') {
  if (!notificationsEnabled) return;
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Format currency
function formatCurrency(amount) {
  const converted = amount * (exchangeRates[currentCurrency] || 1);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currentCurrency
  }).format(converted);
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Notifications Toggle ---
function toggleNotifications() {
  notificationsEnabled = !notificationsEnabled;
  localStorage.setItem('aliester-notifications', notificationsEnabled);
  updateNotificationIcon();
  updateNotificationsToggle();
  showToast(notificationsEnabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
}

function updateNotificationIcon() {
  const btn = document.getElementById('btn-notifications');
  if (!btn) return;

  if (notificationsEnabled) {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
    btn.classList.remove('active');
  } else {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    btn.classList.add('active');
  }
}

function toggleNotificationsFromSettings(checked) {
  notificationsEnabled = checked;
  localStorage.setItem('aliester-notifications', notificationsEnabled);
  updateNotificationIcon();
}

function updateNotificationsToggle() {
  const toggle = document.getElementById('notifications-toggle');
  if (toggle) toggle.checked = notificationsEnabled;
}

// --- Settings Dropdown ---
function toggleSettings() {
  const dropdown = document.getElementById('settings-dropdown');
  dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.navbar-settings-wrapper');
  const dropdown = document.getElementById('settings-dropdown');
  if (wrapper && !wrapper.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

// --- Dark Mode ---
function toggleDarkMode(enabled) {
  document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
  localStorage.setItem('aliester-darkMode', enabled);
}

// --- Currency ---
function changeCurrency(currency) {
  currentCurrency = currency;
  localStorage.setItem('aliester-currency', currency);
  Router.resolve();
}

// --- Font Size ---
function changeFontSize(size) {
  currentFontSize = size;
  const sizes = { small: '12px', normal: '14px', large: '16px' };
  document.documentElement.style.fontSize = sizes[size] || '14px';
  localStorage.setItem('aliester-fontSize', size);
}

// --- Sidebar Collapse ---
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('aliester-sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

function loadSidebarState() {
  const collapsed = localStorage.getItem('aliester-sidebar-collapsed') === 'true';
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && collapsed) {
    sidebar.classList.add('collapsed');
  }
}

// --- Drag & Drop Modules ---
let draggedItem = null;

function initModuleDragDrop() {
  const sections = document.querySelectorAll('.sidebar-section');
  const modulesSection = sections[1]; // Second section = "Mis Modulos"
  if (!modulesSection) return;

  const items = modulesSection.querySelectorAll('.sidebar-item');
  items.forEach(item => {
    item.setAttribute('draggable', 'true');

    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.route);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      modulesSection.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('drag-over'));
      draggedItem = null;
      saveModuleOrder();
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem === item) return;
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (draggedItem === item || !draggedItem) return;

      const allItems = [...modulesSection.querySelectorAll('.sidebar-item')];
      const draggedIdx = allItems.indexOf(draggedItem);
      const droppedIdx = allItems.indexOf(item);

      if (draggedIdx < droppedIdx) {
        modulesSection.insertBefore(draggedItem, item.nextSibling);
      } else {
        modulesSection.insertBefore(draggedItem, item);
      }
    });
  });

  loadModuleOrder();
}

function saveModuleOrder() {
  const sections = document.querySelectorAll('.sidebar-section');
  const modulesSection = sections[1];
  if (!modulesSection) return;

  const order = [...modulesSection.querySelectorAll('.sidebar-item')].map(i => i.dataset.route);
  localStorage.setItem('aliester-module-order', JSON.stringify(order));
}

function loadModuleOrder() {
  const saved = localStorage.getItem('aliester-module-order');
  if (!saved) return;

  const order = JSON.parse(saved);
  const sections = document.querySelectorAll('.sidebar-section');
  const modulesSection = sections[1];
  if (!modulesSection) return;

  order.forEach(route => {
    const item = modulesSection.querySelector(`[data-route="${route}"]`);
    if (item) modulesSection.appendChild(item);
  });
}

// --- Load Saved Preferences ---
function loadPreferences() {
  // Dark mode
  const savedDarkMode = localStorage.getItem('aliester-darkMode') === 'true';
  if (savedDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = true;
  }

  // Currency
  const savedCurrency = localStorage.getItem('aliester-currency');
  if (savedCurrency) {
    currentCurrency = savedCurrency;
    const select = document.getElementById('currency-select');
    if (select) select.value = savedCurrency;
  }

  // Notifications
  const savedNotifications = localStorage.getItem('aliester-notifications');
  if (savedNotifications !== null) {
    notificationsEnabled = savedNotifications === 'true';
    updateNotificationIcon();
    updateNotificationsToggle();
  }

  // Font size
  const savedFontSize = localStorage.getItem('aliester-fontSize');
  if (savedFontSize) {
    changeFontSize(savedFontSize);
    const select = document.getElementById('font-size-select');
    if (select) select.value = savedFontSize;
  }

  // Sidebar collapsed
  loadSidebarState();
}

// Init app — gated on auth
document.addEventListener('DOMContentLoaded', () => {
  loadPreferences();

  // Router is initialized only after auth resolves.
  setTimeout(() => {
    if (!window.insforge) {
      var loading = document.getElementById('auth-loading');
      if (loading) {
        loading.innerHTML =
          '<p class="auth-loading-text">No se pudo cargar el sistema. Recarga la pagina.</p>';
      }
    }
  }, 10000);
});

window.addEventListener('auth-loading', () => {
  // Loading state is shown by default.
});

window.addEventListener('auth-ready', async (e) => {
  const user = e.detail?.user ?? null;

  if (user) {
    showAppShell(user);
    if (typeof loadAllData === 'function' && !isDataLoaded()) {
      await loadAllData();
    }
    Router.init();
    if (typeof aliInit === 'function') aliInit();
    initModuleDragDrop();
  } else {
    showAuthScreen();
  }
});
