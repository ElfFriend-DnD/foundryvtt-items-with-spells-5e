//@ts-check
import { ItemsWithSpells5e } from '../items-with-spells-5e.js';
import { ItemsWithSpells5eItem } from './item.js';

/**
 * A class made to make managing the operations for an Actor.
 */
export class ItemsWithSpells5eActor {
  /**
   * Set up the create Item hook
   */
  static init() {
    Hooks.on('createItem', this.handleCreateItem);
    Hooks.on('deleteItem', this.handleDeleteItem);
  }

  /**
   * Add the item created's attached items to the actor.
   * @param {Item5e} itemDeleted
   */
  static removeChildSpellsFromActor = async (itemDeleted) => {
    // abort if no item provided or if not an owned item
    if (!itemDeleted || !itemDeleted.isOwned) {
      return;
    }

    const itemWithSpellsItem = new ItemsWithSpells5eItem(itemDeleted);

    // do nothing if there are no item spells
    if (!itemWithSpellsItem.itemSpellList.length) {
      return;
    }

    const actorSpellsFromItem = itemDeleted.actor.items.filter((item) => {
      const parentItemUuid = item.getFlag(ItemsWithSpells5e.MODULE_ID, ItemsWithSpells5e.FLAGS.parentItem);
      if (!parentItemUuid) return false;

      return parentItemUuid === itemDeleted.uuid;
    });

    const itemIdsToDelete = actorSpellsFromItem.map((item) => item.id);

    ItemsWithSpells5e.log(false, 'removeChildSpellsFromActor', actorSpellsFromItem, itemIdsToDelete);

    return itemDeleted.parent.deleteEmbeddedDocuments('Item', itemIdsToDelete);
  };

  /**
   * Remove spells from flags on the parent actor.
   *
   * @param {Item} itemDeleted - Item removed from an actor.
   */
  static handleDeleteItem = async (itemDeleted, options, userId) => {
    // do nothing if we are not the one creating the item
    if (userId !== game.user.id) {
      return;
    }

    // do nothing if the item was not created on an actor
    if (!itemDeleted.parent || !(itemDeleted.parent instanceof Actor)) {
      return;
    }

    ItemsWithSpells5e.log(false, 'handleDeleteItem', itemDeleted);

    this.removeChildSpellsFromActor(itemDeleted);
  };

  /**
   * Add the item created's attached items to the actor.
   * @param {Item5e} itemCreated
   */
  static addChildSpellsToActor = async (itemCreated) => {
    // abort if no item provided or if not an owned item
    if (!itemCreated || !itemCreated.isOwned) {
      return;
    }

    const itemWithSpellsItem = new ItemsWithSpells5eItem(itemCreated);

    // do nothing if there are no item spells
    if (!itemWithSpellsItem.itemSpellList.length) {
      return;
    }
    const itemSpellData = [...(await itemWithSpellsItem.itemSpellItemMap).values()].map((item) => item.toJSON());

    ItemsWithSpells5e.log(false, 'addChildSpellsToActor', itemSpellData);

    return itemCreated.parent.createEmbeddedDocuments('Item', itemSpellData);
  };

  /**
   * Add spells from flags to the parent actor.
   *
   * @param {Item} itemCreated - Item on an actor.
   */
  static handleCreateItem = async (itemCreated, options, userId) => {
    // do nothing if we are not the one creating the item
    if (userId !== game.user.id) {
      return;
    }

    // do nothing if the item was not created on an actor
    if (!itemCreated.parent || !(itemCreated.parent instanceof Actor)) {
      return;
    }

    ItemsWithSpells5e.log(false, 'handleCreateItem', itemCreated);

    this.addChildSpellsToActor(itemCreated);
  };
}
