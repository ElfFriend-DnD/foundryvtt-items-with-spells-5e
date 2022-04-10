//@ts-check
import { ItemsWithSpells5e } from '../items-with-spells-5e.js';

/**
 * A class made to make managing the operations for an Item with spells attached easier.
 */
export class ItemsWithSpells5eItem {
  constructor(item) {
    this.item = item;

    this._itemSpellItems = null;
  }

  get itemSpellList() {
    return this.item.getFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells) ?? [];
  }

  get itemSpellItemMap() {
    if (this._itemSpellItems === null) {
      return this.getItemSpellItems();
    }

    return this._itemSpellItems;
  }

  // get itemSpellItemArray() {
  //   if (this._itemSpellItems === null) {
  //     return [];
  //   }
  //   return [...this.itemSpellItemMap.values()];
  // }

  /**
   * Gets the child item from its uuid.
   * If the uuid points to an item already created on the actor: return that item.
   * Otherwise create a temporary item and return that item's json.
   */
  async getChildItem({ uuid, changes = {} }) {
    const original = await fromUuid(uuid);

    if (original.getFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.parentItem) === this.item.uuid) {
      return original;
    }

    const fixedChanges = {
      ['flags.core.sourceId']: uuid,
      [`flags.${ItemsWithSpells5e.MODULE_ID}.${ItemsWithSpells5e.FLAGS.parentItem}`]: this.item.uuid,
      // [`flags.${ItemsWithSpells5e.MODULE_ID}.${ItemsWithSpells5e.FLAGS.sourceUuid}`]: uuid,
      ['data.preparation.mode']: 'item',
    };

    const update = foundry.utils.mergeObject(changes, fixedChanges);
    const childItem = new CONFIG.Item.documentClass(original.toJSON(), { temporary: true });
    await childItem.data.update(update);
    return childItem; //.toJSON();
  }

  /**
   * Get a cached copy of temporary items or create and cache those items.
   * @returns {Promise<Map<string, Item5e>>} - array of temporary items created from the uuids attached to this item
   */
  async getItemSpellItems() {
    if (this._itemSpellItems) {
      return this._itemSpellItems; // [...this._itemSpellItems.values()];
    }

    const itemMap = new Map();

    await Promise.all(
      this.itemSpellList.map(async ({ uuid, changes }) => {
        const childItem = await this.getChildItem({ uuid, changes });
        itemMap.set(childItem.id, childItem);
        return childItem;
      }),
    );

    this._itemSpellItems = itemMap;
    return itemMap; //[...itemMap.values()];
  }

  /**
   * Adds a given UUID to the item's spell list
   * @param {string} uuid
   */
  async addSpellToItem(uuid) {
    const itemSpells = [...this.itemSpellList, { uuid }];

    this.item.setFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells, itemSpells);
  }

  /**
   * Removes an item from this item's spells
   * @param {string} itemId - the id of the item to remove
   */
  async removeSpellFromItem(itemId) {
    const itemToDelete = this.itemSpellItemMap.get(itemId);

    const sourceUuid = itemToDelete.getFlag('core', 'sourceId'); // ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.sourceUuid);

    const newItemSpells = this.itemSpellList.filter(({ uuid }) => uuid !== sourceUuid);

    await this.item.setFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells, newItemSpells);

    this._itemSpellItems.delete(itemId);
  }
}
