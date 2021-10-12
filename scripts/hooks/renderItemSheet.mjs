import { ItemsWithSpells } from "../classes/ItemsWithSpells.mjs";

Hooks.on('renderItemSheet', async (app, html, data) => {
  // Update the nav menu
  const spellsTabButton = $(
    '<a class="item" data-tab="spells">' + game.i18n.localize(`DND5E.ItemTypeSpellPl`) + '</a>',
  );
  const tabs = html.find('.tabs[data-group="primary"]');
  tabs.append(spellsTabButton);

  // Create the tab
  const sheetBody = html.find('.sheet-body');
  const spellsTab = $(`<div class="tab spells flexcol" data-group="primary" data-tab="spells"></div>`);
  sheetBody.append(spellsTab);

  // Add the list to the tab
  const spellsTabHtml = $(await renderSpellsList(app.item));
  spellsTab.append(spellsTabHtml);

  // Activate Listeners for this ui.

  // Register a DragDrop handler for adding new spells to this item
  const dragDrop = new DragDrop({
    dragSelector: '.item',
    dropSelector: '.item-list',
    permissions: {drop: () => app.isEditable},
    callbacks: {drop: dragEnd.bind(app)}
  });

  dragDrop.bind(html[0]);
});

/**
 * Ensure the item dropped is a spell, add the spell to the item flags.
 */
async function dragEnd(event) {
  ItemsWithSpells.log(false, 'dragEnd', {event});

  let data;
  try {
    data = JSON.parse(event.dataTransfer.getData('text/plain'));
  }
  catch (err) {
    return;
  }

  ItemsWithSpells.log(false, 'dragEnd', {data});

  if (data.type !== 'Item') {
    return;
  }

  const item = await Item.implementation.fromDropData(data);
  ItemsWithSpells.log(false, 'dragEnd', {item});

  if (item.type !== 'spell') {
    return;
  }

  const itemSpellFlagToAdd = {uuid: item.uuid, changes: {}};
  const itemSpells = this.item.getFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells);
  itemSpells.push(itemSpellFlagToAdd);
  return this.item.setFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells, itemSpells);
}

async function renderSpellsList(parentItem) {
  const itemSpells = parentItem.getFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells) ?? [];

  const itemSpellItems = await Promise.all(
    itemSpells.map(async ({uuid, changes}) => {
      const childItemData = await ItemsWithSpells.getChildItemData({uuid, changes}, parentItem);
      return Item.create(childItemData, {temporary: true});
    })
  );

  return renderTemplate(ItemsWithSpells.TEMPLATES.spellsTab, {
    itemSpells: itemSpellItems,
    isOwner: parentItem.isOwner,
  });
}
