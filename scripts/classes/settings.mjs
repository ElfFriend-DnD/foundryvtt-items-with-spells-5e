export const EXCLUDED_TYPES = [
  "class",
  "subclass",
  "background",
  "race",
  "spell",
  "loot"
];

export function _registerSettings() {
  const TYPES = Item.TYPES.filter(t => !EXCLUDED_TYPES.includes(t));

  for(const type of TYPES){
    game.settings.register("items-with-spells-5e", `includeItemType${type.titleCase()}`, {
      scope: "world",
      config: false,
      type: Boolean,
      default: true,
      requiresReload: true
    });
  }

  game.settings.registerMenu("items-with-spells-5e", "itemTypeExclusion", {
    name: "items-with-spells-5e.SETTINGS.ITEM_EXCLUSION.NAME",
    hint: "items-with-spells-5e.SETTINGS.ITEM_EXCLUSION.HINT",
    scope: "world",
    config: true,
    type: IWS_TypeSettings,
    label: "items-with-spells-5e.SETTINGS.ITEM_EXCLUSION.NAME"
  });
}

class IWS_TypeSettings extends FormApplication {

  get id(){
    return "items-with-spells-5e-itemTypeExclusion-menu";
  }

  get title(){
    return "Item Type Exclusion Menu";
  }

  get template(){
    return "modules/items-with-spells-5e/templates/settingsMenu.hbs";
  }

  async getData(){
    const TYPES = Item.TYPES.filter(t => !EXCLUDED_TYPES.includes(t));
    const data = await super.getData();
    data.types = [];
    console.log({types: data.types, TYPES, data});
    for(const type of TYPES){
      const label = type.titleCase();
      data.types.push({
        checked: game.settings.get("items-with-spells-5e", `includeItemType${label}`),
        value: type,
        label
      });
    }
    return data;
  }

  async _updateObject(event, formData){
    Object.entries(formData).forEach(([type, bool]) => {
      game.settings.set("items-with-spells-5e", `includeItemType${type.titleCase()}`, bool);
    });
  }
}