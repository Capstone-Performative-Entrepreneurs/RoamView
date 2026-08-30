(function () {
  const APP_PAGES = ['dashboard', 'teleop', 'viewer', 'sessions', 'report'];
  const TITLES = {
    gallery: 'RoamView — UI Mockup Gallery',
    dashboard: 'Dashboard — RoamView',
    teleop: 'Teleoperation — RoamView',
    viewer: '3D Tour Viewer — RoamView',
    sessions: 'Session History — RoamView',
    report: 'Inspection Report — RoamView',
  };

  function navigate(page) {
    const gallery = document.getElementById('view-gallery');
    const app = document.getElementById('view-app');

    if (!page || page === 'gallery') {
      gallery.hidden = false;
      app.hidden = true;
      document.title = TITLES.gallery;
      setActiveNav('gallery');
      return;
    }

    const target = APP_PAGES.includes(page) ? page : 'dashboard';
    gallery.hidden = true;
    app.hidden = false;

    APP_PAGES.forEach(function (id) {
      const el = document.getElementById('page-' + id);
      if (el) el.hidden = id !== target;
    });

    document.title = TITLES[target] || TITLES.dashboard;
    setActiveNav(target);
  }

  function setActiveNav(page) {
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      link.classList.toggle('active', link.dataset.nav === page);
    });
  }

  document.addEventListener('click', function (e) {
    const link = e.target.closest('[data-nav]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.nav;
    if (location.hash !== '#' + page) {
      location.hash = page;
    } else {
      navigate(page);
    }
  });

  window.addEventListener('hashchange', function () {
    navigate(location.hash.slice(1) || 'gallery');
  });

  document.addEventListener('DOMContentLoaded', function () {
    navigate(location.hash.slice(1) || 'gallery');
  });
})();
