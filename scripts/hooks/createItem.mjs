import { ItemsWithSpells } from '../classes/ItemsWithSpells.mjs';

/**
 * Add spells from flags to the parent actor.
 *
 * @param itemCreated {Item} - Item on an actor.
 * @returns
 */
async function addChildSpellsToActor(itemCreated) {
  const itemSpells = itemCreated.getFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells);

  // do nothing if there are no item spells OR this is not an owned item
  if (!itemSpells?.length || !itemCreated.isOwned) {
    return;
  }

  const itemSpellData = await Promise.all(
    itemSpells.map(({ uuid, changes }) => ItemsWithSpells.getChildItemData({ uuid, changes }, itemCreated)),
  );

  return itemCreated.parent.createEmbeddedDocuments('Item', itemSpellData);
}

Hooks.on('createItem', async (itemCreated, options, userId) => {
  ItemsWithSpells.log(false, {
    itemCreated,
  });

  // do nothing if we are not the one creating the item
  if (userId !== game.user.id) {
    return;
  }

  addChildSpellsToActor(itemCreated);
});
