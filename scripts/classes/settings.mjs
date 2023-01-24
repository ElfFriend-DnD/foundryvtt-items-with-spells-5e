import { ItemsWithSpells5e } from "../items-with-spells-5e.js";

// the item types that can NEVER have spells in them.
export const EXCLUDED_TYPES = [
  "class",
  "subclass",
  "background",
  "race",
  "spell",
  "loot"
];

export function _registerSettings() {
  const TYPES = Item.TYPES.filter(t => !EXCLUDED_TYPES.includes(t));

  for (const type of TYPES) {
    game.settings.register(ItemsWithSpells5e.MODULE_ID, `includeItemType${type.titleCase()}`, {
      scope: "world",
      config: false,
      type: Boolean,
      default: true,
      requiresReload: true
    });
  }

  game.settings.register(ItemsWithSpells5e.MODULE_ID, "sortOrder", {
    name: `${ItemsWithSpells5e.MODULE_ID}.SETTINGS.SORT_ORDER.NAME`,
    hint: `${ItemsWithSpells5e.MODULE_ID}.SETTINGS.SORT_ORDER.HINT`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false
  });

  game.settings.registerMenu(ItemsWithSpells5e.MODULE_ID, "itemTypeExclusion", {
    name: `${ItemsWithSpells5e.MODULE_ID}.SETTINGS.ITEM_EXCLUSION.NAME`,
    hint: `${ItemsWithSpells5e.MODULE_ID}.SETTINGS.ITEM_EXCLUSION.HINT`,
    scope: "world",
    config: true,
    type: IWS_TypeSettings,
    label: `${ItemsWithSpells5e.MODULE_ID}.SETTINGS.ITEM_EXCLUSION.NAME`,
    restricted: true
  });
}

class IWS_TypeSettings extends FormApplication {

  get id() {
    return `${ItemsWithSpells5e.MODULE_ID}-item-type-exclusion-menu`;
  }

  get title() {
    return game.i18n.localize(`${ItemsWithSpells5e.MODULE_ID}.SETTINGS.ITEM_EXCLUSION.TITLE`);
  }

  get template() {
    return "modules/items-with-spells-5e/templates/settingsMenu.hbs";
  }

  async getData() {
    const TYPES = Item.TYPES.filter(t => !EXCLUDED_TYPES.includes(t));
    const data = await super.getData();
    data.types = [];
    for (const type of TYPES) {
      const label = type.titleCase();
      data.types.push({
        checked: game.settings.get(ItemsWithSpells5e.MODULE_ID, `includeItemType${label}`),
        value: type,
        label
      });
    }
    return data;
  }

  async _updateObject(event, formData) {
    Object.entries(formData).forEach(([type, bool]) => {
      game.settings.set(ItemsWithSpells5e.MODULE_ID, `includeItemType${type.titleCase()}`, bool);
    });
  }
}
