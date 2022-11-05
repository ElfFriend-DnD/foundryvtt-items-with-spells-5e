//@ts-check
import { ItemsWithSpells5e } from '../items-with-spells-5e.js';
import { ItemsWithSpells5eActor } from './actor.js';
import { ItemsWithSpells5eItemSheet } from './item-sheet.js';

/**
 * Creates a fake temporary item as filler for when a UUID is unable to resolve an item
 * @param {string} uuid - the `uuid` of the source of this item
 * @returns item with the correct flags to allow deletion
 */
const FakeEmptySpell = (uuid, parent) =>
  new Item.implementation(
    {
      name: game.i18n.localize(`${ItemsWithSpells5e.MODULE_ID}.MISSING_ITEM`),
      img: 'icons/svg/hazard.svg',
      type: 'spell',
      system: {
        description: {
          value: game.i18n.localize(`${ItemsWithSpells5e.MODULE_ID}.MISSING_ITEM_DESCRIPTION`),
        },
      },
      _id: uuid.split('.').pop(),
    },
    { temporary: true, parent },
  );

/**
 * A class made to make managing the operations for an Item with spells attached easier.
 */
export class ItemsWithSpells5eItem {
  constructor(item) {
    this.item = item;

    this._itemSpellFlagMap = null;
    this._itemSpellItems = null;
  }

  /**
   * A map of what the "id" of the new spell would be to its corresponding flag definition on this parent item
   * Used when updating an item's overrides as the map lookup is easier than the array lookup
   */
  get itemSpellFlagMap() {
    if (this._itemSpellFlagMap === null) {
      return this._getItemSpellFlagMap();
    }

    return this._itemSpellFlagMap;
  }

  /**
   * Raw flag data
   */
  get itemSpellList() {
    return this.item.getFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells) ?? [];
  }

  /**
   * A map of what the "id" of the New spell would be to its corresponding Item Data, taking any defined overrides into account.
   */
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
    ItemsWithSpells5e.log(false, 'REFRESHING', this.itemSpellList);
    this._getItemSpellFlagMap();
    await this._getItemSpellItems();
    ItemsWithSpells5e.log(false, 'REFRESHed');
  }

  /**
   * Gets the child item from its uuid and provided changes.
   * If the uuid points to an item already created on the actor: return that item.
   * Otherwise create a temporary item, apply changes, and return that item's json.
   */
  async _getChildItem({ uuid, changes = {} }) {
    // original could be in a compendium or on an actor
    let original = await fromUuid(uuid);

    ItemsWithSpells5e.log(false, 'original', original);

    // return a fake 'empty' item if we could not create a childItem
    if (!original) {
      original = FakeEmptySpell(uuid, this.item.parent);
    }

    // this exists if the 'child' spell has been created on an actor
    if (original.getFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.parentItem) === this.item.uuid) {
      return original;
    }

    // these changes are always applied
    const fixedChanges = {
      ['flags.core.sourceId']: uuid, // set the sourceId as the original spell
      [`flags.${ItemsWithSpells5e.MODULE_ID}.${ItemsWithSpells5e.FLAGS.parentItem}`]: this.item.uuid,
      ['system.preparation.mode']: 'atwill',
    };

    const update = foundry.utils.mergeObject(changes, fixedChanges);

    // backfill the 'charges' and 'target' for parent-item-charge consumption style spells
    if (foundry.utils.getProperty(changes, 'system.consume.amount')) {
      foundry.utils.mergeObject(update, {
        'system.consume.type': 'charges',
        'system.consume.target': this.item.id,
      });
    }

    const childItem = new Item.implementation(original.toObject(), {
      temporary: true,
      keepId: false,
      parent: this.item.parent,
    });
    await childItem.updateSource(update);

    ItemsWithSpells5e.log(false, 'getChildItem', childItem);

    return childItem;
  }

  /**
   * Get a cached copy of temporary items or create and cache those items with the changes from flags applied.
   * @returns {Promise<Map<string, Item5e>>} - array of temporary items created from the uuids and changes attached to this item
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
   * Get or Create a cached map of child spell item "ids" to their flags
   * Useful when updating overrides for a specific 'child spell'
   * @returns {Map<string, object>} - Map of ids to flags
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
   * @param {string} providedUuid
   */
  async addSpellToItem(providedUuid) {
    // MUTATED if this is an owned item
    let uuid = providedUuid;

    if (this.item.isOwned) {
      // if this item is already on an actor, we need to
      // 0. see if the uuid is already on the actor
      // 1. create the dropped uuid on the Actor's item list (OR update that item to be a child of this one)
      // 2. get the new uuid from the created item
      // 3. add that uuid to this item's flags\
      const fullItemData = await fromUuid(uuid);

      if (!fullItemData) {
        ui.notifications.error('Item data not found');
        console.error('Item data for', uuid, 'not found');
        return;
      }

      const adjustedItemData = foundry.utils.mergeObject(fullItemData.toObject(), {
        ['flags.core.sourceId']: uuid, // set the sourceId as the original spell
        [`flags.${ItemsWithSpells5e.MODULE_ID}.${ItemsWithSpells5e.FLAGS.parentItem}`]: this.item.uuid,
        ['system.preparation.mode']: 'atwill',
      });

      const [newItem] = await this.item.parent.createEmbeddedDocuments('Item', [adjustedItemData]);

      uuid = newItem.uuid;

      ItemsWithSpells5e.log(false, 'new item created', newItem);
    }

    const itemSpells = [...this.itemSpellList, { uuid }];

    // this update should not re-render the item sheet because we need to wait until we refresh to do so
    await this.item.update(
      {
        flags: {
          [ItemsWithSpells5e.MODULE_ID]: {
            [ItemsWithSpells5e.FLAGS.itemSpells]: itemSpells,
          },
        },
      },
      { render: false },
    );

    await this.refresh();

    // now re-render the item and actor sheets
    this.item.render();

    if (this.item.parent) {
      this.item.parent.render();
    }
  }

  /**
   * Removes the relationship between the provided item and this item's spells
   * @param {string} itemId - the id of the item to remove
   * @param {Object} options
   * @param {boolean} [options.alsoDeleteEmbeddedSpell] - Should the spell be deleted also, only for owned items
   */
  async removeSpellFromItem(itemId, { alsoDeleteEmbeddedSpell } = {}) {
    const itemToDelete = this.itemSpellItemMap.get(itemId);

    let uuidToRemove; // spell item's uuid this item stores for its relationship

    if (this.item.isOwned) {
      // in this case we are storing the actual owned spell item's UUID
      uuidToRemove = itemToDelete.uuid;
    } else {
      // in the un-owned case, we store the sourceId
      uuidToRemove = itemToDelete.getFlag('core', 'sourceId');
    }

    const newItemSpells = this.itemSpellList.filter(({ uuid }) => uuid !== uuidToRemove);

    // update the data manager's internal store of the items it contains
    this._itemSpellItems?.delete(itemId);
    this._itemSpellFlagMap?.delete(itemId);

    await this.item.setFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.itemSpells, newItemSpells);

    if (!this.item.isOwned) {
      return;
    }

    // remove the spell's `parentItem` flag
    const spellItem = fromUuidSync(uuidToRemove);

    // the other item has already been deleted probably, do nothing
    if (!spellItem) {
      return;
    }

    let shouldDeleteSpell =
      alsoDeleteEmbeddedSpell &&
      (await Dialog.confirm({
        title: game.i18n.localize(`${ItemsWithSpells5e.MODULE_ID}.MODULE_NAME`),
        content: game.i18n.localize(`${ItemsWithSpells5e.MODULE_ID}.WARN_ALSO_DELETE`),
      }));

    if (shouldDeleteSpell) {
      await spellItem.delete();
    } else {
      await spellItem.unsetFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.parentItem);
    }
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

    const newItemSpellsFlagValue = [...this.itemSpellFlagMap.values()];

    // this update should not re-render the item sheet because we need to wait until we refresh to do so
    await this.item.update(
      {
        flags: {
          [ItemsWithSpells5e.MODULE_ID]: {
            [ItemsWithSpells5e.FLAGS.itemSpells]: newItemSpellsFlagValue,
          },
        },
      },
      { render: false },
    );

    // update this data manager's understanding of the items it contains
    await this.refresh();

    ItemsWithSpells5eItemSheet.instances.forEach((instance) => {
      if (instance.itemWithSpellsItem === this) {
        instance._shouldOpenSpellsTab = true;
      }
    });

    // now re-render the item sheets
    this.item.render();
  }
}
