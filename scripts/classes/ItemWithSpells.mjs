import { ItemsWithSpells } from './ItemsWithSpells.mjs';

/**
 * A class made to make managing the operations for an Item sheet easier.
 */
export class ItemWithSpells {
  itemSpellItems;

  constructor(app, html, data) {
    this.app = app;
    this.item = app.item;
    this.sheetHtml = html;
  }

  get itemSpellList() {
    return this.item.getFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells) ?? [];
  }

  /**
   * Gets the child item.
   * If the uuid points to an item already created on the actor: return that item.
   * Otherwise create a temporary item and return that.
   */
  async getChildItem({ uuid, changes }) {
    const original = await fromUuid(uuid);

    if (original.getFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.parentItem) === this.item.uuid) {
      return original;
    }

    const fixedChanges = {
      [`flags.${ItemsWithSpells.MODULE_ID}.${ItemsWithSpells.FLAGS.parentItem}`]: this.item.uuid,
      [`flags.${ItemsWithSpells.MODULE_ID}.${ItemsWithSpells.FLAGS.sourceUuid}`]: uuid,
      ['data.preparation.mode']: 'item',
    };

    const update = foundry.utils.mergeObject(changes, fixedChanges);
    const childItemData = foundry.utils.mergeObject(original.toJSON(), update);
    return Item.create(childItemData, { temporary: true });
  }

  /**
   * Get a cached copy of temporary items or create and cache those items.
   */
  async getItemSpellItems() {
    if (this.itemSpellItems) {
      return this.itemSpellItems;
    }

    const itemMap = new Map();

    await Promise.all(
      this.itemSpellList.map(async ({ uuid, changes }) => {
        const childItem = await this.getChildItem({ uuid, changes }, this.item);
        itemMap.set(childItem.id, childItem);
        return childItem;
      }),
    );

    this.itemSpellItems = itemMap;
    return [...itemMap.values()];
  }

  /**
   * Renders the spell tab template to be injected
   */
  async renderSpellsList() {
    return renderTemplate(ItemsWithSpells.TEMPLATES.spellsTab, {
      itemSpells: await this.getItemSpellItems(),
      isOwner: this.item.isOwner,
    });
  }

  /**
   * Ensure the item dropped is a spell, add the spell to the item flags.
   */
  async dragEnd(event) {
    ItemsWithSpells.log(false, 'dragEnd', { event });

    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }

    ItemsWithSpells.log(false, 'dragEnd', { data });

    if (data.type !== 'Item') {
      return;
    }

    const item = await Item.implementation.fromDropData(data);
    ItemsWithSpells.log(false, 'dragEnd', { item });

    if (item.type !== 'spell') {
      return;
    }

    const itemSpellFlagToAdd = { uuid: item.uuid, changes: {} };
    const itemSpells = [...this.itemSpellList, itemSpellFlagToAdd];

    return this.item.setFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells, itemSpells);
  }

  async handleItemClick(event) {
    const { itemId } = $(event.currentTarget).parents('[data-item-id]').data();
    const item = this.itemSpellItems.get(itemId);
    item?.sheet.render(true, { editable: false });
  }

  async handleItemDeleteClick(event) {
    const { itemId } = $(event.currentTarget).parents('[data-item-id]').data();

    const itemToDelete = this.itemSpellItems.get(itemId);

    const sourceUuid = itemToDelete.getFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.sourceUuid);

    const newItemSpells = this.itemSpellList.filter(({ uuid }) => uuid !== sourceUuid);

    await this.item.setFlag(ItemsWithSpells.MODULE_ID, ItemsWithSpells.FLAGS.itemSpells, newItemSpells);

    this.itemSpellItems.delete(itemId);
  }

  async render() {
    // Update the nav menu
    const spellsTabButton = $(
      '<a class="item" data-tab="spells">' + game.i18n.localize(`DND5E.ItemTypeSpellPl`) + '</a>',
    );
    const tabs = this.sheetHtml.find('.tabs[data-group="primary"]');
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
