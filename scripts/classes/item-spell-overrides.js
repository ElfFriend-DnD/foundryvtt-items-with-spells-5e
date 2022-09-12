//@ts-check
import { ItemsWithSpells5e } from '../items-with-spells-5e.js';

/**
 * The form to control Item Spell overrides (e.g. for consumption logic)
 */
export class ItemsWithSpells5eItemSpellOverrides extends FormApplication {
  constructor(itemWithSpellsItem, itemSpellId) {
    const itemSpellFlagData = itemWithSpellsItem.itemSpellFlagMap.get(itemSpellId);
    ItemsWithSpells5e.log(false, { itemSpellFlagData });
    // set the `object` of this FormApplication as the itemSpell data from the parent item's flags
    super(itemSpellFlagData?.changes ?? {});

    // the spell we are editing
    this.itemSpellId = itemSpellId;

    // the ItemsWithSpells5eItem instance to use
    this.itemWithSpellsItem = itemWithSpellsItem;

    // the parent item
    this.item = itemWithSpellsItem.item;

    // the fake or real spell item
    this.itemSpellItem = itemWithSpellsItem.itemSpellItemMap.get(itemSpellId);
  }

  get title() {
    return `${this.item.name} - ${this.itemSpellItem.name}`;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['dnd5e', 'sheet', 'item'],
      template: ItemsWithSpells5e.TEMPLATES.overrides,
      width: 560,
      closeOnSubmit: false,
      height: 400,
    });
  }

  getData() {
    ItemsWithSpells5e.log(false, 'getData', {
      item: this.itemWithSpellsItem,
      itemSpellitem: this.itemSpellItem,
      object: this.object,
      parentItem: {
        id: this.item.id,
        name: this.item.name,
        isOwned: this.item.isOwned,
      },
    });

    return {
      save: this.itemSpellItem.system.save,
      overrides: this.object,
      config: {
        limitedUsePeriods: CONFIG.DND5E.limitedUsePeriods,
        abilities: CONFIG.DND5E.abilities,
      },
      parentItem: {
        id: this.item.id,
        name: this.item.name,
        isOwned: this.item.isOwned,
      },
    };
  }

  async _updateObject(event, formData) {
    ItemsWithSpells5e.log(false, '_updateObject', formData);

    const formDataExpanded = foundry.utils.expandObject(formData);

    await this.itemWithSpellsItem.updateItemSpellOverrides(this.itemSpellId, formDataExpanded.overrides);

    this.object = formDataExpanded.overrides;

    this.render();

    if (this.item.isOwned) {
      ui.notifications.warn('The existing spells on the parent actor will not be modified to reflect this change.');
    }
  }
}
