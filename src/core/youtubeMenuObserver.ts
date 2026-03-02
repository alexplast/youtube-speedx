let menuObserver: MutationObserver | null = null;

export const stopYouTubeMenuObserver = () => {
  if (menuObserver) menuObserver.disconnect();
  menuObserver = null;
};

export const startYouTubeMenuObserver = (player: HTMLElement, openModalCallback: () => void) => {
  stopYouTubeMenuObserver();

  const createSettingsMenuItem = () => {
    const menuItem = document.createElement('div');
    menuItem.className = 'ytp-menuitem';
    menuItem.id = 'yt-speedx-menu-item';

    const iconContainer = document.createElement('div');
    iconContainer.className = 'ytp-menuitem-icon';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('fill', 'white');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z');
    svg.appendChild(path);
    iconContainer.appendChild(svg);

    const label = document.createElement('div');
    label.className = 'ytp-menuitem-label';
    label.textContent = 'YouTube SpeedX Settings';

    const content = document.createElement('div');
    content.className = 'ytp-menuitem-content';

    menuItem.append(iconContainer, label, content);

    menuItem.addEventListener('click', () => {
      const settingsButton = document.querySelector('.ytp-settings-button') as HTMLElement | null;
      if (settingsButton) settingsButton.click();
      openModalCallback();
    });

    return menuItem;
  };

  menuObserver = new MutationObserver(() => {
    const panelMenu = document.querySelector('.ytp-panel-menu');
    if (!panelMenu) return;

    const panel = panelMenu.closest('.ytp-panel');
    const isRootMenu = !!panel && !panel.querySelector('.ytp-panel-back-button');
    const hasMenuItem = !!panelMenu.querySelector('#yt-speedx-menu-item');

    if (isRootMenu && !hasMenuItem) {
      const newItem = createSettingsMenuItem();
      panelMenu.prepend(newItem);
    }
  });

  menuObserver.observe(player, { childList: true, subtree: true });
};

