//@ts-check
import { ItemsWithSpells5eActorSheet } from './classes/actor-sheet.js';
import { ItemsWithSpells5eActor } from './classes/actor.js';
import { ItemsWithSpells5eItemSheet } from './classes/item-sheet.js';
import { _registerSettings } from './classes/settings.mjs';

export class ItemsWithSpells5e {
  static API = {};

  static MODULE_ID = 'items-with-spells-5e';

  static SETTINGS = {};

  static FLAGS = {
    itemSpells: 'item-spells',
    parentItem: 'parent-item',
  };

  static TEMPLATES = {
    spellsTab: `modules/${this.MODULE_ID}/templates/spells-tab.hbs`,
    overrides: `modules/${this.MODULE_ID}/templates/overrides-form.hbs`,
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

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(ItemsWithSpells5e.MODULE_ID);
});

Hooks.once('init', () => {
  ItemsWithSpells5e.log(true, 'Initialized');

  ItemsWithSpells5e.preloadTemplates();

  ItemsWithSpells5eActorSheet.init();
});

Hooks.once("setup", _registerSettings);

ItemsWithSpells5eItemSheet.init();
ItemsWithSpells5eActor.init();
