
/* =========================================================
   PRAVA PREVIEW BUILDER v20 — SAFE CORE + NOTES
========================================================= */

(function() {
function init() {
  var page=document.querySelector('.sf-page-prava');if(!page)return;
  var form=page.querySelector('form');
  function hidden(name,value) {
    var input=form.querySelector('input[type="hidden"][name="'+name+'"]');
    if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}
    input.value=value;return input;
  }
  // Normalize the real source controls before Webflow's data-name serialization.
  var phone=form.querySelector('[data-contact-field="phone"]');
  if(phone){phone.id='prava-phone';phone.name='phone';phone.setAttribute('data-name','Phone');if(phone.previousElementSibling?.tagName==='LABEL')phone.previousElementSibling.htmlFor=phone.id;}
  var extras=page.querySelectorAll('.prava-extras-card [data-field] input[type="checkbox"]');
  extras.forEach(function(input){var field=input.closest('[data-field]').dataset.field;input.id='prava-extra-'+field;input.name=field;input.setAttribute('data-name',field);var label=input.closest('label');if(label)label.setAttribute('for',input.id);});
  var roles=['upper','lower','countertop','backsplash'];
  roles.forEach(function(role){
    var wrap=page.querySelector('[data-field="'+role+'_finish"]'),note=wrap.querySelector('textarea,input:not([type="hidden"]):not([type="search"])');
    if(!note){var holder=wrap.querySelector('.text-area-wrap');if(holder){note=document.createElement('textarea');note.rows=2;holder.append(note);}}
    if(note){note.name=role+'_finish_note';note.id='prava-'+role+'-note';note.setAttribute('data-name',note.name);var label=note.parentElement.querySelector('label');if(label)label.setAttribute('for',note.id);}
  });
  var finalNote=form.querySelector('textarea[data-field="final_note"]');if(finalNote){finalNote.name='final_note';finalNote.setAttribute('data-name','final_note');}
  hidden('backsplash_orientation','horizontal');
  function sync(){
    ['dishwasher','washing_machine','microwave','coffee_machine'].forEach(function(name){var select=page.querySelector('[name="'+name+'_type"]');hidden(name,select&&select.value?'Да':'Не');});
    if(finalNote)hidden('field-4',finalNote.value).setAttribute('data-name','Field 4');
    var custom=page.querySelector('.booking-custom-date');if(custom)hidden('custom_date',custom.value.trim());
    hidden('appliances_json',JSON.stringify(window.collectPravaKitchenConfig?window.collectPravaKitchenConfig().appliances:{}));
  }
  page.addEventListener('change',sync);page.addEventListener('input',sync);sync();
  form.addEventListener("submit", function (e) {
    sync();
  var form = e.target;
  if (!form || !form.querySelector('[name="preview_link"]')) return;

  var page = form.closest(".sf-page-prava");

  function clean(v) {
    return String(v || "").replace(/\s+/g, " ").trim();
  }

  function get(name) {
    var el =
      form.querySelector('[name="' + name + '"]') ||
      document.querySelector('[name="' + name + '"]');

    return clean(el && el.value);
  }

  function getNote(keys) {
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];

      var el =
        form.querySelector('textarea[name="' + key + '"], input[name="' + key + '"]') ||
        form.querySelector('[data-field="' + key + '"] textarea, [data-field="' + key + '"] input') ||
        form.querySelector('textarea[data-field="' + key + '"], input[data-field="' + key + '"]') ||
        document.querySelector('textarea[name="' + key + '"], input[name="' + key + '"]') ||
        document.querySelector('[data-field="' + key + '"] textarea, [data-field="' + key + '"] input') ||
        document.querySelector('textarea[data-field="' + key + '"], input[data-field="' + key + '"]');

      if (el && clean(el.value)) return clean(el.value);
    }

    return "";
  }

  function add(params, key, value) {
    value = clean(value);
    if (value) params.set(key, value);
  }

  function imgSrc(img) {
    return img ? clean(img.currentSrc || img.src || img.getAttribute("src")) : "";
  }

  function selectedCard(field) {
    var wrap = page.querySelector('[data-field="' + field + '"]');
    if (!wrap) return null;
    return wrap.querySelector(".vm-selected") || wrap.querySelector(".is-selected") || wrap.querySelector(".active");
  }

  function selectedText(field) {
    var material=window.pravaMaterialSelections&&window.pravaMaterialSelections.get(field);
    if(material)return material.value;
    var card = selectedCard(field);
    return clean(card && (card.getAttribute("data-value") || card.textContent));
  }

  function selectedImg(field) {
    var material=window.pravaMaterialSelections&&window.pravaMaterialSelections.get(field);
    if(material)return material.sampleImageUrl||"";
    var card = selectedCard(field);
    return imgSrc(card && card.querySelector("img"));
  }

  function firstImg(selector) {
    return imgSrc(page.querySelector(selector));
  }

  function yesNo(name) {
    var v = clean(get(name)).toLowerCase();

    if (["да", "yes", "true", "1"].indexOf(v) > -1) return "Да";
    if (["не", "no", "false", "0"].indexOf(v) > -1) return "Не";

    var cb = page.querySelector('[data-field="' + name + '"] input[type="checkbox"], [data-checkbox-field="' + name + '"]');
    return cb && cb.checked ? "Да" : "Не";
  }

  function cadKey() {
    var water = clean(get("water_position_prava") || selectedText("water_position_prava")).toLowerCase();
    var oven = clean(get("oven_tall_unit") || selectedText("oven_tall_unit")).toLowerCase();
    var fridge = clean(get("fridge_type") || selectedText("fridge_type")).toLowerCase();

    var side = water.indexOf("right") > -1 || water.indexOf("дяс") > -1 ? "right" : "left";
    var hasOven = oven.indexOf("yes") > -1 || oven.indexOf("да") > -1;
    var hasFridge = fridge.indexOf("вгра") > -1 || fridge.indexOf("built") > -1 || fridge.indexOf("yes") > -1;

    if (hasOven && hasFridge) return "kitchen-" + side + "-oven-fridge-built";
    if (hasOven) return "kitchen-" + side + "-oven";
    if (hasFridge) return "kitchen-" + side + "-fridge-built";
    return "kitchen-" + side + "-base";
  }

  function cadImgByKey(key) {
    return firstImg(".cad-img-kitchen." + key + ", .cad-kitchen ." + key + ", img." + key);
  }

  var params = new URLSearchParams();

  var water = get("water_position_prava") || selectedText("water_position_prava");
  var oven = get("oven_tall_unit") || selectedText("oven_tall_unit");
  var fridge = get("fridge_type") || selectedText("fridge_type");
  var deep = get("deep_cabinets") || selectedText("deep_cabinets");
  var island = get("island") || selectedText("island");

  var wall1 = get("len_prava_3") || get("wall_1");
  var height = get("height_prava_3") || get("room_height");
  var islandLen = get("island_len_3a") || get("island_len");
  var islandWidth = get("island_width_3a") || get("island_width");
  var islandCombined = get("island_combined") || (islandLen && islandWidth ? islandLen + " × " + islandWidth : "");

  add(params, "water_position_prava", water);
  add(params, "water_position", water);
  add(params, "oven_tall_unit", oven);
  add(params, "fridge_type", fridge);
  add(params, "deep_cabinets", deep);
  add(params, "island", island);
  add(params, "island_enabled", island);

  add(params, "len_prava_3", wall1);
  add(params, "wall_1", wall1);
  add(params, "height_prava_3", height);
  add(params, "room_height", height);
  add(params, "island_len_3a", islandLen);
  add(params, "island_len", islandLen);
  add(params, "island_width_3a", islandWidth);
  add(params, "island_width", islandWidth);
  add(params, "island_combined", islandCombined);

  ["upper_finish", "lower_finish", "countertop_finish", "backsplash_finish"].forEach(function (key) {
    add(params, key, get(key) || selectedText(key));
    add(params, key + "_img", get(key + "_img") || selectedImg(key));
  });

  add(params, "upper_finish_note", getNote(["upper_finish_note", "upper_finish_note_prava", "upper_note_prava", "upper_note"]));
  add(params, "lower_finish_note", getNote(["lower_finish_note", "lower_finish_note_prava", "lower_note_prava", "lower_note"]));
  add(params, "countertop_finish_note", getNote(["countertop_finish_note", "countertop_note_prava", "countertop_note", "countertop_finish_note_prava"]));
  add(params, "backsplash_finish_note", getNote(["backsplash_finish_note", "backsplash_note_prava", "backsplash_note", "backsplash_finish_note_prava"]));

  add(params, "final_note", getNote([
    "final_note",
    "final_note_prava",
    "client_note",
    "client_note_prava",
    "project_note",
    "project_note_prava",
    "additional_note",
    "additional_notes",
    "message",
    "notes"
  ]));

  [
    "dishwasher",
    "washing_machine",
    "microwave",
    "coffee_machine",
    "handleless",
    "panel_doors",
    "glass_display",
    "more_drawers",
    "lift_mechanisms",
    "counter_lighting",
    "bottle_rack"
  ].forEach(function (key) {
    add(params, key, yesNo(key));
  });

  var inspText =
    get("inspiration_card_prava") ||
    get("inspiration_card") ||
    selectedText("inspiration_card_prava") ||
    selectedText("inspiration");

  var inspImg =
    selectedImg("inspiration_card_prava") ||
    selectedImg("inspiration_card") ||
    selectedImg("inspiration") ||
    firstImg(".inspiration-card.vm-selected img, .inspiration-card.is-selected img, .inspiration-card.active img");

  add(params, "inspiration_card_prava", inspText);
  add(params, "inspiration_card", inspText);
  add(params, "inspiration_card_prava_img", inspImg);
  add(params, "inspiration_card_img", inspImg);

  var plan = get("plan_prava_3") || get("plan") || selectedText("plan_prava_3");
  var meetingDate = get("meeting_date");
  var meetingSlot = get("meeting_slot");
  var customDate = get("custom_date");

  add(params, "plan_prava_3", plan);
  add(params, "plan", plan);
  add(params, "meeting_date", meetingDate);
  add(params, "meeting_slot", meetingSlot);
  add(params, "custom_date", customDate);
  add(params, "meeting_combined", meetingDate && meetingSlot ? meetingDate + " / " + meetingSlot : customDate);

  var key = cadKey();

  add(params, "cad_key", key);
  add(params, "cad_img", cadImgByKey(key));
  add(params, "cad_island_img", firstImg(".cad-img-island, .cad-island img, .cad-prava-island img"));
  add(params, "cad_deep_img", firstImg(".cad-img-deep, .cad-img-deep_cabinets, .cad-img-deep-cabinets, .cad-deep_cabinets img, .cad-deep-cabinets img"));

  var finalLink = window.location.origin + "/prava-preview?" + params.toString();

  form.querySelector('[name="preview_link"]').value =
    "=== НАЧАЛО НА ЛИНКА ===\n" +
    finalLink +
    "\n=== КРАЙ НА ЛИНКА ===";

  }, true); // Capture runs before Webflow's delegated submit/serialization handler.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
