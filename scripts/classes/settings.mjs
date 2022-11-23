export const EXTRA_EXCLUDED_TYPES = [
  "class",
  "subclass",
  "feat",
  "background",
  "race"
];

export function _registerSettings() {
  game.settings.register("items-with-spells-5e", "itemTypeExclusion", {
    name: "items-with-spells-5e.SETTINGS.ITEM_EXCLUSION.NAME",
    hint: "items-with-spells-5e.SETTINGS.ITEM_EXCLUSION.HINT",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });
}
