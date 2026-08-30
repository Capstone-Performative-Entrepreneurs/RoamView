(function () {
  const PAGES = ['dashboard', 'teleop', 'viewer', 'sessions', 'report', 'settings'];
  const TITLES = {
    gallery: 'RoamView Mobile — Mockups',
    dashboard: 'Fleet — RoamView',
    teleop: 'Teleop — RoamView',
    viewer: '3D Tour — RoamView',
    sessions: 'Sessions — RoamView',
    report: 'Report — RoamView',
    settings: 'Settings — RoamView',
  };

  function navigate(page) {
    const gallery = document.getElementById('view-gallery');
    const phone = document.getElementById('view-phone');

    if (!page || page === 'gallery') {
      gallery.hidden = false;
      phone.hidden = true;
      document.title = TITLES.gallery;
      setActiveNav('gallery');
      return;
    }

    const target = PAGES.includes(page) ? page : 'dashboard';
    gallery.hidden = true;
    phone.hidden = false;

    PAGES.forEach(function (id) {
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
    document.querySelectorAll('.tab-bar a').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.nav === page);
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
