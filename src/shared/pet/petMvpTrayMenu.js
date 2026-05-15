function formatActivePetName(activePetName) {
  const name = String(activePetName || '').trim();
  return name || '未选择宠物';
}

function getPackageName(petPackage = {}) {
  return String(
    petPackage.manifest?.name ||
    petPackage.name ||
    petPackage.packageDir ||
    '未命名宠物',
  ).trim();
}

function createSwitchPetSubmenu(packages = [], handlers = {}) {
  if (!Array.isArray(packages) || packages.length === 0) {
    return [{ label: '没有可切换的宠物包', enabled: false }];
  }

  return packages.map((petPackage) => {
    const packageDir = petPackage.packageDir;
    const label = getPackageName(petPackage);

    return {
      label,
      type: 'radio',
      checked: Boolean(petPackage.active),
      enabled: Boolean(packageDir && petPackage.ok !== false),
      click: () => handlers.onSetActivePet?.(packageDir),
    };
  });
}

function createPetMvpTrayMenuTemplate(options = {}) {
  const handlers = options.handlers ?? {};
  const activePetName = formatActivePetName(options.activePetName);
  const packages = Array.isArray(options.packages) ? options.packages : [];

  return [
    { label: `当前宠物：${activePetName}`, enabled: false },
    { type: 'separator' },
    { label: '显示宠物', click: () => handlers.onShow?.() },
    { label: '隐藏宠物', click: () => handlers.onHide?.() },
    { label: '找回 / 重置位置', click: () => handlers.onResetPlacement?.() },
    { type: 'separator' },
    { label: '导入宠物包…', click: () => handlers.onImportPet?.() },
    {
      label: '切换宠物',
      submenu: createSwitchPetSubmenu(packages, handlers),
    },
    { type: 'separator' },
    { label: '退出', click: () => handlers.onQuit?.() },
  ];
}

module.exports = {
  createPetMvpTrayMenuTemplate,
  createSwitchPetSubmenu,
  formatActivePetName,
  getPackageName,
};
