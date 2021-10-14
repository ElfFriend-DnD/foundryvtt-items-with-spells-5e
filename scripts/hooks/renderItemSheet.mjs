import { ItemsWithSpells } from '../classes/ItemsWithSpells.mjs';
import { ItemWithSpells } from '../classes/ItemWithSpells.mjs';

Hooks.on('renderItemSheet', async (app, html, data) => {
  new ItemWithSpells(app, html, data).render();
});
