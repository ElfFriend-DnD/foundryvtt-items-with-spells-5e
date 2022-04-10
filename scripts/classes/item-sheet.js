//@ts-check
import { ItemsWithSpells5e } from '../items-with-spells-5e.js';
import { ItemsWithSpells5eItem } from './item.js';

/**
 * A class made to make managing the operations for an Item sheet easier.
 */
export class ItemsWithSpells5eItemSheet {
  constructor(app, html) {
    this.app = app;
    this.item = app.item;
    this.sheetHtml = html;
    this.itemWithSpellsItem = new ItemsWithSpells5eItem(this.item);
  }

  /**
   * Handles the item sheet render hook
   */
  static init() {
    Hooks.on('renderItemSheet', async (app, html) => {
      if (app.item.type === 'spell') {
        return;
      }
      return new this(app, html).render();
    });
  }

  /**
   * Renders the spell tab template to be injected
   */
  async renderSpellsList() {
    const itemSpellsArray = [...(await this.itemWithSpellsItem.itemSpellItemMap).values()];
    ItemsWithSpells5e.log(false, 'rendering list', itemSpellsArray);
    return renderTemplate(ItemsWithSpells5e.TEMPLATES.spellsTab, {
      itemSpells: itemSpellsArray,
      isOwner: this.item.isOwner,
    });
  }

  /**
   * Ensure the item dropped is a spell, add the spell to the item flags.
   */
  async dragEnd(event) {
    ItemsWithSpells5e.log(false, 'dragEnd', { event });

    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }

    ItemsWithSpells5e.log(false, 'dragEnd', { data });

    if (data.type !== 'Item') {
      return;
    }

    const item = await Item.implementation.fromDropData(data);
    ItemsWithSpells5e.log(false, 'dragEnd', { item });

    if (item.type !== 'spell') {
      return;
    }

    return this.itemWithSpellsItem.addSpellToItem(item.uuid);
  }

  async handleItemClick(event) {
    const { itemId } = $(event.currentTarget).parents('[data-item-id]').data();
    const item = this.itemWithSpellsItem.itemSpellItemMap.get(itemId);
    item?.sheet.render(true, { editable: false });
  }

  async handleItemDeleteClick(event) {
    const { itemId } = $(event.currentTarget).parents('[data-item-id]').data();

    return this.itemWithSpellsItem.removeSpellFromItem(itemId);
  }

  async render() {
    // Update the nav menu
    const spellsTabButton = $(
      '<a class="item" data-tab="spells">' + game.i18n.localize(`DND5E.ItemTypeSpellPl`) + '</a>',
    );
    const tabs = this.sheetHtml.find('.tabs[data-group="primary"]');

    if (!tabs) {
      return;
    }

    tabs.append(spellsTabButton);

    // Create the tab
    const sheetBody = this.sheetHtml.find('.sheet-body');
    const spellsTab = $(`<div class="tab spells flexcol" data-group="primary" data-tab="spells"></div>`);
    sheetBody.append(spellsTab);

    // Add the list to the tab
    const spellsTabHtml = $(await this.renderSpellsList());
    spellsTab.append(spellsTabHtml);

    // Activate Listeners for this ui.
    spellsTabHtml.on('click', '.item-name', this.handleItemClick.bind(this));
    spellsTabHtml.on('click', '.item-delete', this.handleItemDeleteClick.bind(this));

    // Register a DragDrop handler for adding new spells to this item
    const dragDrop = new DragDrop({
      dragSelector: '.item',
      dropSelector: '.items-with-spells-tab',
      permissions: { drop: () => this.app.isEditable },
      callbacks: { drop: this.dragEnd.bind(this) },
    });

    dragDrop.bind(this.sheetHtml[0]);
  }
}
