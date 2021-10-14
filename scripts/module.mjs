import { ItemsWithSpells } from './classes/ItemsWithSpells.mjs';
import './hooks/createItem.mjs';
import './hooks/renderItemSheet.mjs';

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(ItemsWithSpells.MODULE_ID);
});

Hooks.once('init', () => {
  ItemsWithSpells.log(true, 'Initialized');

  ItemsWithSpells.preloadTemplates();
});
