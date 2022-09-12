//@ts-check
import { ItemsWithSpells5e } from '../items-with-spells-5e.js';

/**
 * A class made to make managing the operations for an Actor.
 */
export class ItemsWithSpells5eActorSheet {
  /**
   * Set up the Actor Sheet Patch
   */
  static init() {
    libWrapper.register(
      ItemsWithSpells5e.MODULE_ID,
      'dnd5e.applications.actor.ActorSheet5eCharacter.prototype._prepareSpellbook',
      ItemsWithSpells5eActorSheet.prepareItemSpellbook,
      'WRAPPER',
    );

    libWrapper.register(
      ItemsWithSpells5e.MODULE_ID,
      'dnd5e.applications.actor.ActorSheet5eNPC.prototype._prepareSpellbook',
      ItemsWithSpells5eActorSheet.prepareItemSpellbook,
      'WRAPPER',
    );
  }

  static prepareItemSpellbook(wrapped, data, spells) {
    ItemsWithSpells5e.log(false, 'preparing spells', { spells, data });
    const nonItemSpells = spells.filter((spell) => {
      if (spell.system.preparation.mode !== 'item') {
        return true;
      }

      const parentItemUuid = foundry.utils.getProperty(
        spell,
        `flags.${ItemsWithSpells5e.MODULE_ID}.${ItemsWithSpells5e.FLAGS.parentItem}`,
      );

      return !this.actor.items.find((item) => item.uuid === parentItemUuid);
    });

    const spellbook = wrapped(data, nonItemSpells);

    ItemsWithSpells5e.log(false, 'preparing spells', { spells, data, spellbook });

    const createItemSection = (itemName, value, max) => ({
      order: -5,
      label: itemName,
      usesSlots: false,
      canCreate: false,
      canPrepare: false,
      spells: [],
      uses: value ?? '-',
      slots: max ?? '-',
      override: 0,
      dataset: {},
      prop: 'item',
    });

    const spellItems = spells.filter((spell) => spell.system.preparation.mode === 'item');

    const itemsWithSpells = this.actor.items.filter(
      (item) => item.getFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells)?.length,
    );

    // create a new spellbook section for each item with spells attached
    itemsWithSpells.forEach((itemWithSpells) => {
      if (itemWithSpells.system.attunement === 1) {
        return;
      }

      const section = createItemSection(
        itemWithSpells.name,
        itemWithSpells.system?.uses?.value,
        itemWithSpells.system?.uses?.max,
      );

      section.spells = spellItems.filter((spell) => {
        ItemsWithSpells5e.log(false, 'filtering spells', spell);

        const parentItem = foundry.utils.getProperty(
          spell,
          `flags.${ItemsWithSpells5e.MODULE_ID}.${ItemsWithSpells5e.FLAGS.parentItem}`,
        );

        return parentItem === itemWithSpells.uuid;
      });

      spellbook.push(section);
    });

    spellbook.sort((a, b) => a.order - b.order || a.label - b.label);

    return spellbook;
  }
}
