//@ts-check
import { ItemsWithSpells5e } from '../items-with-spells-5e.js';

/**
 * A class made to make managing the operations for an Item with spells attached easier.
 */
export class ItemsWithSpells5eItem {
  constructor(item) {
    this.item = item;

    this._itemSpellFlagMap = null;
    this._itemSpellItems = null;
  }

  get itemSpellFlagMap() {
    if (this._itemSpellFlagMap === null) {
      return this._getItemSpellFlagMap();
    }

    return this._itemSpellFlagMap;
  }

  get itemSpellList() {
    return this.item.getFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells) ?? [];
  }

  get itemSpellItemMap() {
    if (this._itemSpellItems === null) {
      return this._getItemSpellItems();
    }

    return this._itemSpellItems;
  }

  /**
   * Update this class's understanding of the item spells
   */
  async refresh() {
    this._getItemSpellFlagMap();
    await this._getItemSpellItems();
  }

  /**
   * Gets the child item from its uuid.
   * If the uuid points to an item already created on the actor: return that item.
   * Otherwise create a temporary item and return that item's json.
   */
  async _getChildItem({ uuid, changes = {} }) {
    const original = await fromUuid(uuid);

    ItemsWithSpells5e.log(false, 'original', original);

    if (!original) {
      return undefined;
    }

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

    // backfill the 'charges' and 'target' for parent-item-charge consumption style spells
    if (foundry.utils.getProperty(update, 'data.consume.amount')) {
      foundry.utils.mergeObject(update, {
        'data.consume.type': 'charges',
        'data.consume.target': this.item.id,
      });
    }

    const childItem = new CONFIG.Item.documentClass(original.toJSON(), { temporary: true });
    await childItem.data.update(update);
    return childItem;
  }

  /**
   * Get a cached copy of temporary items or create and cache those items.
   * @returns {Promise<Map<string, Item5e>>} - array of temporary items created from the uuids attached to this item
   */
  async _getItemSpellItems() {
    const itemMap = new Map();

    await Promise.all(
      this.itemSpellList.map(async ({ uuid, changes }) => {
        const childItem = await this._getChildItem({ uuid, changes });
        if (!childItem) return;

        itemMap.set(childItem.id, childItem);
        return childItem;
      }),
    );

    this._itemSpellItems = itemMap;
    return itemMap;
  }

  /**
   * Get a cached copy of temporary items or create and cache those items.
   * @returns {Map<string, Item5e>} - array of temporary items created from the uuids attached to this item
   */
  _getItemSpellFlagMap() {
    const map = new Map();
    this.itemSpellList.forEach((itemSpellFlag) => {
      const id = itemSpellFlag.uuid.split('.').pop();
      map.set(id, itemSpellFlag);
    });
    this._itemSpellFlagMap = map;
    return map;
  }

  /**
   * Adds a given UUID to the item's spell list
   * @param {string} uuid
   */
  async addSpellToItem(uuid) {
    const itemSpells = [...this.itemSpellList, { uuid }];

    await this.item.setFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells, itemSpells);

    // update this data manager's understanding of the items it contains
    await this.refresh();
  }

  /**
   * Removes an item from this item's spells
   * @param {string} itemId - the id of the item to remove
   */
  async removeSpellFromItem(itemId) {
    const itemToDelete = this.itemSpellItemMap.get(itemId);

    const sourceUuid = itemToDelete.getFlag('core', 'sourceId');

    const newItemSpells = this.itemSpellList.filter(({ uuid }) => uuid !== sourceUuid);

    await this.item.setFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells, newItemSpells);

    // update the data manager's internal store of the items it contains
    this._itemSpellItems?.delete(itemId);
    this._itemSpellFlagMap?.delete(itemId);
  }

  /**
   * Updates the given item's overrides
   * @param {*} itemId - spell attached to this item
   * @param {*} overrides - object describing the changes that should be applied to the spell
   */
  async updateItemSpellOverrides(itemId, overrides) {
    const itemSpellFlagsToUpdate = this.itemSpellFlagMap.get(itemId);

    itemSpellFlagsToUpdate.changes = overrides;

    this.itemSpellFlagMap.set(itemId, itemSpellFlagsToUpdate);

    const newItemSpells = [...this.itemSpellFlagMap.values()];

    await this.item.setFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells, newItemSpells);

    // update this data manager's understanding of the items it contains
    await this.refresh();
  }
}
