export class ItemsWithSpells {
  static API = {};

  static MODULE_ID = 'items-with-spells-5e';

  static SETTINGS = {};

  static FLAGS = {
    itemSpells: 'item-spells',
    parentItem: 'parent-item',
  };

  static TEMPLATES = {
    spellsTab: `modules/${this.MODULE_ID}/templates/spells-tab.hbs`,
  };

  /**
   * A console.log wrapper which checks if we are debugging before logging
   */
  static log(force, ...args) {
    try {
      const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.MODULE_ID, 'boolean');

      if (shouldLog) {
        console.log(this.MODULE_ID, '|', ...args);
      }
    } catch (e) {
      console.error(e.message);
    }
  }

  static preloadTemplates() {
    loadTemplates(Object.values(flattenObject(this.TEMPLATES)));
  }
}
