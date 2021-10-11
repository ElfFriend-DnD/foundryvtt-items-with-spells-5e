import { ItemsWithSpells } from "../classes/ItemsWithSpells.mjs";

Hooks.on('renderItemSheet', async (app, html) => {
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

  // add the list to the tab
  const spellsTabHtml = $(await renderSpellsList(app.item));
  spellsTab.append(spellsTabHtml);
});

async function renderSpellsList(parentItem) {
  const itemSpells = parentItem.getFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells) ?? [];

  const itemSpellItems = await Promise.all(
    itemSpells.map(async ({uuid, changes}) => {
      const childItemData = await ItemsWithSpells.getChildItemData({uuid, changes}, parentItem);
      return Item.create(childItemData, {temporary: true});
    })
  );

  return renderTemplate(ItemsWithSpells.TEMPLATES.spellsTab, {
    itemSpells: itemSpellItems
  });
}
