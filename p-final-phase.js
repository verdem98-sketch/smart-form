/* =========================================================
   CHAPTER 8
   P BOOKING CALENDAR
   ========================================================= */
console.log("🔥 CH8 P BOOKING LOADED");
document.addEventListener("DOMContentLoaded", function () {
  var flow = document.querySelector(".sf-page-p");
  if (!flow) return;

  var form = flow.querySelector("form");
  if (!form) return;

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function show(el) {
    if (el) el.style.display = "";
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  function normalize(value) {
    return String(value || "").trim();
  }

  function lower(value) {
    return normalize(value).toLowerCase();
  }

  function isVisible(el) {
    if (!el) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toISODateLocal(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function formatDateBG(date) {
    return date.toLocaleDateString("bg-BG", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
  }

  function safeJSONParse(value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }

  function setHidden(name, value) {
    var input = qs(flow, '[name="' + name + '"]') || qs(document, '[name="' + name + '"]');
    if (input) input.value = value || "";
  }

  var DAYS_TO_SHOW = 7;
  var START_OFFSET = 2;
  var SLOTS = ["10:00–12:00", "14:00–16:00"];
  var STORAGE_KEY = "smartFormSelectedSlotState_p_v1";
  var LEGACY_STORAGE_KEYS = ["smartFormSelectedSlotState_p", "smartFormSelectedSlotState_p_v0"];

  function saveSlotState(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function loadSlotState() {
    try {
      return safeJSONParse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function initFinalPhase(phase, index) {
    var bookingDays = qs(phase, ".booking-days");
    var customDateInput = qs(phase, ".booking-custom-date");
    var lockedHelp = qs(phase, ".booking-locked-help");

    if (!bookingDays) return;

    var selectedSlotState = null;
    var submittedLocked = false;

    function getBlockedDates() {
      return qsa(phase, ".blocked-date-value")
        .map(function (node) {
          return normalize(node.textContent);
        })
        .filter(function (value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        });
    }

    function getBookedSlots() {
      return qsa(phase, ".booked-slot-item")
        .map(function (item) {
          var dateEl = qs(item, ".booked-slot-date");
          var timeEl = qs(item, ".booked-slot-time");
          var statusEl = qs(item, ".booked-slot-status");

          return {
            date: normalize(dateEl && dateEl.textContent),
            time: normalize(timeEl && timeEl.textContent),
            status: lower(statusEl && statusEl.textContent)
          };
        })
        .filter(function (item) {
          return /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.time && item.status;
        });
    }

    var blockedDates = getBlockedDates();
    var bookedSlots = getBookedSlots();

    function getSlotStatus(dateISO, slotText) {
      var match = bookedSlots.find(function (item) {
        return item.date === dateISO && item.time === slotText;
      });

      return match ? match.status : "";
    }

    function isUnavailable(dateISO, slotText) {
      var status = getSlotStatus(dateISO, slotText);
      return status === "booked" || status === "pending";
    }

    function hasFreeSlot(dateISO) {
      if (blockedDates.indexOf(dateISO) !== -1) return false;

      return SLOTS.some(function (slotText) {
        return !isUnavailable(dateISO, slotText);
      });
    }

    function lockCalendarUI() {
      submittedLocked = true;

      if (lockedHelp) {
        show(lockedHelp);

        var textEl = qs(lockedHelp, ".booking-locked-text");
        var saved = loadSlotState();

        if (textEl && saved && saved.date && saved.slot) {
          var d = new Date(saved.date);

          textEl.textContent =
            "Изпрати заявка за " +
            d.toLocaleDateString("bg-BG", {
              weekday: "long",
              day: "numeric",
              month: "long"
            }) +
            " · " +
            saved.slot +
            ". Ако искаш промяна, обади се.";
        }
      }

      qsa(phase, ".booking-slot").forEach(function (el) {
        if (
          !el.classList.contains("active") &&
          !el.classList.contains("is-booked") &&
          !el.classList.contains("is-pending")
        ) {
          el.classList.add("is-local-locked");
        }
      });
    }

    function clearActiveSlots() {
      qsa(flow, ".booking-slot").forEach(function (el) {
        el.classList.remove("active");
      });
    }

    function setSelectedSlot(slotEl, dateISO, slotText, save) {
      clearActiveSlots();

      slotEl.classList.add("active");

      selectedSlotState = {
        date: dateISO,
        slot: slotText
      };

      setHidden("meeting_date", dateISO);
      setHidden("meeting_slot", slotText);

      if (customDateInput) {
        customDateInput.value = "";
        setHidden("custom_date", "");
      }

      if (save !== false) {
        var existing = loadSlotState() || {};
        saveSlotState({
          date: dateISO,
          slot: slotText,
          submitted: !!existing.submitted
        });
      }
    }

    function createSlot(dateISO, slotText) {
      var slot = document.createElement("div");
      slot.className = "booking-slot";
      slot.textContent = slotText;
      slot.setAttribute("data-date", dateISO);
      slot.setAttribute("data-slot", slotText);
      slot.setAttribute("data-instance", String(index));

      var status = getSlotStatus(dateISO, slotText);

      if (status === "booked") {
        slot.classList.add("is-booked");
        slot.setAttribute("aria-disabled", "true");
        return slot;
      }

      if (status === "pending") {
        slot.classList.add("is-pending");
        slot.setAttribute("aria-disabled", "true");
        return slot;
      }

      slot.addEventListener("click", function () {
        if (submittedLocked) return;
        setSelectedSlot(slot, dateISO, slotText, true);
      });

      return slot;
    }

    function createDayCard(date) {
      var dateISO = toISODateLocal(date);

      var dayCard = document.createElement("div");
      dayCard.className = "booking-day";

      var title = document.createElement("div");
      title.className = "booking-date";
      title.textContent = formatDateBG(date);

      dayCard.appendChild(title);

      if (blockedDates.indexOf(dateISO) !== -1) {
        var blockedLabel = document.createElement("div");
        blockedLabel.className = "booking-day-status";
        blockedLabel.textContent = "Няма свободни часове";

        dayCard.classList.add("is-blocked-day");
        dayCard.appendChild(blockedLabel);

        return dayCard;
      }

      var slotsWrap = document.createElement("div");
      slotsWrap.className = "booking-slots";

      SLOTS.forEach(function (slotText) {
        slotsWrap.appendChild(createSlot(dateISO, slotText));
      });

      if (!hasFreeSlot(dateISO)) {
        dayCard.classList.add("is-full-day");
      }

      dayCard.appendChild(slotsWrap);

      return dayCard;
    }

    function generateCalendarDays() {
      bookingDays.innerHTML = "";

      var current = new Date();
      current.setHours(12, 0, 0, 0);
      current.setDate(current.getDate() + START_OFFSET);

      var freeDaysAdded = 0;
      var safety = 0;

      while (freeDaysAdded < DAYS_TO_SHOW && safety < 90) {
        var day = current.getDay();
        var iso = toISODateLocal(current);

        if (day !== 0 && day !== 6) {
          bookingDays.appendChild(createDayCard(new Date(current)));

          if (hasFreeSlot(iso)) {
            freeDaysAdded++;
          }
        }

        current.setDate(current.getDate() + 1);
        safety++;
      }
    }

    function restoreFromStorage() {
      var saved = loadSlotState();
      if (!saved || !saved.date || !saved.slot) return;

      var slotEl = qs(
        phase,
        '.booking-slot[data-date="' + saved.date + '"][data-slot="' + saved.slot + '"]'
      );

      if (!slotEl) return;

      if (
        slotEl.classList.contains("is-booked") ||
        slotEl.classList.contains("is-pending")
      ) {
        return;
      }

      setSelectedSlot(slotEl, saved.date, saved.slot, false);

      if (saved.submitted) {
        lockCalendarUI();
      }
    }

    if (customDateInput) {
      customDateInput.addEventListener("input", function () {
        if (submittedLocked) return;

        var value = normalize(customDateInput.value);

        if (value) {
          clearActiveSlots();
          selectedSlotState = null;

          setHidden("meeting_date", "");
          setHidden("meeting_slot", "");
          setHidden("custom_date", value);
        } else {
          setHidden("custom_date", "");
        }
      });
    }

    var formBlock = form.closest(".w-form");
    var successEl = formBlock ? qs(formBlock, ".w-form-done") : null;

    function markSubmittedAfterSuccess() {
      if (!selectedSlotState) return;
      if (!successEl || !isVisible(successEl)) return;

      saveSlotState({
        date: selectedSlotState.date,
        slot: selectedSlotState.slot,
        submitted: true
      });

      lockCalendarUI();
    }

    if (successEl) {
      new MutationObserver(function () {
        markSubmittedAfterSuccess();
      }).observe(successEl, {
        attributes: true,
        attributeFilter: ["style", "class"]
      });
    }

    form.addEventListener("submit", function () {
      if (!isVisible(phase)) return;
      if (!selectedSlotState) return;

      var current = loadSlotState() || {};
      saveSlotState({
        date: selectedSlotState.date,
        slot: selectedSlotState.slot,
        submitted: false
      });

      if (successEl) {
        setTimeout(markSubmittedAfterSuccess, 250);
        setTimeout(markSubmittedAfterSuccess, 700);
        setTimeout(markSubmittedAfterSuccess, 1500);
      }
    });

    generateCalendarDays();

    if (lockedHelp) hide(lockedHelp);

    try {
      LEGACY_STORAGE_KEYS.forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (e) {}

    restoreFromStorage();
  }

  setHidden("meeting_date", "");
  setHidden("meeting_slot", "");
  setHidden("custom_date", "");

  qsa(flow, ".final-phase").forEach(function (phase, index) {
    initFinalPhase(phase, index);
  });
});




/* =========================================================
   P FINAL PHASE — selection + contact sync + navigation
   ========================================================= */
(function(){
  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true});
    else fn();
  }

  ready(function(){
    var page=document.querySelector(".sf-page-p");
    if(!page) return;

    var form=page.querySelector("form");
    var finalPhase=page.querySelector(".p-final-phase");
    if(!form || !finalPhase) return;

    function qs(scope,sel){ return (scope||document).querySelector(sel); }
    function qsa(scope,sel){ return Array.from((scope||document).querySelectorAll(sel)); }

    function ensureHidden(name){
      var input=form.querySelector('input[type="hidden"][name="'+name+'"]');
      if(!input){
        input=document.createElement("input");
        input.type="hidden";
        input.name=name;
        form.appendChild(input);
      }
      return input;
    }

    function setHidden(name,value){
      var input=ensureHidden(name);
      input.value=value||"";
      input.setAttribute("value",value||"");
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
    }

    function valueOf(el){
      return String((el && (el.getAttribute("data-value") || el.textContent)) || "").trim();
    }

    var inspirationCards=qsa(finalPhase,".inspiration-card");
    inspirationCards.forEach(function(card){
      if(!qs(card,".inspiration-check")){
        var check=document.createElement("div");
        check.className="inspiration-check";
        check.textContent="✓";
        card.appendChild(check);
      }

      card.addEventListener("click",function(e){
        e.preventDefault();

        var active=card.classList.contains("vm-selected") ||
                   card.classList.contains("is-selected") ||
                   card.classList.contains("active");

        inspirationCards.forEach(function(x){
          x.classList.remove("vm-selected","is-selected","active");
        });

        var value="";
        if(!active){
          card.classList.add("vm-selected","is-selected","active");
          value=valueOf(card);
        }

        setHidden("inspiration_card_p",value);
        setHidden("inspiration_card",value);
      });
    });

    var planWrap=qs(finalPhase,".plan-wrap");
    if(planWrap){
      var planBtns=qsa(planWrap,".option-pill");
      planBtns.forEach(function(btn){
        btn.addEventListener("click",function(e){
          e.preventDefault();

          var active=btn.classList.contains("vm-selected") ||
                     btn.classList.contains("is-selected") ||
                     btn.classList.contains("active");

          planBtns.forEach(function(x){
            x.classList.remove("vm-selected","is-selected","active");
          });

          var value="";
          if(!active){
            btn.classList.add("vm-selected","is-selected","active");
            value=valueOf(btn);
          }

          setHidden("plan_p",value);
          setHidden("plan",value);
        });
      });
    }

    var finalName=qs(finalPhase,"#p-final-name");
    var finalEmail=qs(finalPhase,"#p-final-email");
    var finalPhone=qs(finalPhase,"#p-final-phone");

    function syncContacts(){
      var nameTarget=form.querySelector('input[name="Name"]');
      var emailTarget=form.querySelector('input[name="Email"]');

      if(nameTarget && finalName) nameTarget.value=finalName.value||"";
      if(emailTarget && finalEmail) emailTarget.value=finalEmail.value||"";

      if(finalPhone) setHidden("Phone",finalPhone.value||"");
    }

    [finalName,finalEmail,finalPhone].forEach(function(el){
      if(!el) return;
      el.addEventListener("input",syncContacts);
      el.addEventListener("change",syncContacts);
    });
    form.addEventListener("submit",syncContacts,true);

    var flow=qs(page,".flow-p");
    var lowerSix=qs(page,'[data-p-lower-six="true"]');
    var back=qs(page,".sf-back-link");
    var headerTitle=qs(page,".sf-title");
    var headerSub=qs(page,".sf-subtitle");
    var oldTitle=headerTitle ? headerTitle.textContent : "";
    var oldSub=headerSub ? headerSub.textContent : "";

    function isFinalVisible(){
      if(!finalPhase) return false;
      var c=getComputedStyle(finalPhase);
      return c.display!=="none" && c.visibility!=="hidden";
    }

    function openFinal(){
      if(flow) flow.style.setProperty("display","none","important");
      if(lowerSix) lowerSix.style.setProperty("display","none","important");

      finalPhase.style.setProperty("display","block","important");
      finalPhase.style.setProperty("visibility","visible","important");
      finalPhase.style.setProperty("opacity","1","important");

      if(headerTitle) headerTitle.textContent="Последна стъпка";
      if(headerSub) headerSub.textContent="Изберете удобен ден и час. Ще потвърдим по телефона.";

      window.scrollTo(0,0);
      setTimeout(function(){ window.scrollTo(0,0); },100);
      window.dispatchEvent(new Event("resize"));
    }

    function closeFinal(){
      finalPhase.style.setProperty("display","none","important");
      if(flow){
        flow.style.removeProperty("display");
        flow.style.removeProperty("visibility");
        flow.style.removeProperty("opacity");
      }
      if(lowerSix){
        lowerSix.style.removeProperty("display");
        lowerSix.style.removeProperty("visibility");
        lowerSix.style.removeProperty("opacity");
      }

      if(headerTitle) headerTitle.textContent=oldTitle;
      if(headerSub) headerSub.textContent=oldSub;

      window.scrollTo(0,0);
    }

    function selectedValue(field){
      var q=qs(page,'.combo-phase-wrap .question-wrap[data-field="'+field+'"]');
      var selected=q && qs(q,'.option-pill.is-selected, .option-pill.vm-selected, .option-pill.active');
      return selected ? String(selected.getAttribute("data-value") || selected.textContent || "").trim() : "";
    }

    function clearGateHints(){
      qsa(page,'.question-hint, .dimension-hint').forEach(function(hint){
        hint.classList.remove('is-visible');
        hint.style.setProperty('display','none','important');
      });
      qsa(page,'.question-wrap.choice-warning').forEach(function(q){
        q.classList.remove('choice-warning');
      });
    }

    function showQuestionHint(q){
      if(!q) return;
      var hint=qs(q,'.question-hint');
      if(!hint){
        hint=document.createElement('div');
        hint.className='question-hint';
        hint.textContent='Изберете вариант, за да продължим.';
        q.appendChild(hint);
      }
      q.classList.remove('choice-warning');
      void q.offsetWidth;
      q.classList.add('choice-warning');
      hint.classList.add('is-visible');
      hint.style.setProperty('display','block','important');
      setTimeout(function(){
        q.classList.remove('choice-warning');
      },350);
    }

    function firstMissingQuestion(){
      var required=[
        'chimney_position_p',
        'water_position_p',
        'oven_tall_unit_p',
        'fridge_type_p'
      ];

      for(var i=0;i<required.length;i++){
        var q=qs(page,'.combo-phase-wrap .question-wrap[data-field="'+required[i]+'"]');
        if(!q) continue;
        if(!qs(q,'.option-pill.is-selected, .option-pill.vm-selected, .option-pill.active')){
          return q;
        }
      }
      return null;
    }

    function numericPickerValue(control){
      if(!control) return 0;
      var box=qs(control,'.picker-value');
      if(!box) return 0;
      var text=qs(box,'.picker-value-text') || box;
      var n=parseInt(String(text.textContent || '0').trim(),10);
      return isNaN(n) ? 0 : n;
    }

    function rowHasDimension(row){
      var meters=numericPickerValue(qs(row,'.meters-control'));
      var centimeters=numericPickerValue(qs(row,'.centimeters-control'));
      return meters>0 || centimeters>0;
    }

    function rowIsRequired(row){
      if(!row) return false;

      if(row.closest('.dimensions-group-chimney')){
        var chimney=selectedValue('chimney_position_p');
        return !!chimney && chimney!=='none';
      }

      if(row.closest('.dimensions-group-island')){
        return selectedValue('island_enabled_p')==='yes';
      }

      return true;
    }

    function firstMissingDimension(){
      var rows=qsa(page,'.dimensions-phase-wrap .dimension-row');
      for(var i=0;i<rows.length;i++){
        if(!rowIsRequired(rows[i])) continue;
        if(!rowHasDimension(rows[i])) return rows[i];
      }
      return null;
    }

    function showDimensionHint(row){
      if(!row) return;
      var hint=qs(row,'.dimension-hint');
      if(!hint){
        hint=document.createElement('div');
        hint.className='dimension-hint';
        hint.textContent='Попълнете размера, за да продължим.';
        row.appendChild(hint);
      }
      hint.classList.add('is-visible');
      hint.style.setProperty('display','block','important');
      hint.style.setProperty('margin-top','10px','important');
      hint.style.setProperty('color','#9a3b00','important');
      hint.style.setProperty('font-size','14px','important');
      hint.style.setProperty('font-weight','500','important');
    }

    function openComboToQuestion(q){
      var combo=qs(page,'.combo-phase-wrap');
      var dims=qs(page,'.dimensions-phase-wrap');

      finalPhase.style.setProperty('display','none','important');
      if(dims) dims.style.setProperty('display','none','important');
      if(combo) combo.style.setProperty('display','block','important');

      qsa(page,'.combo-phase-wrap .question-wrap[data-field]').forEach(function(item){
        if(item===q){
          item.classList.remove('is-hidden');
          item.style.setProperty('display','block','important');
        }else{
          item.classList.add('is-hidden');
          item.style.setProperty('display','none','important');
        }
      });

      showQuestionHint(q);
      setTimeout(function(){
        q.scrollIntoView({behavior:'smooth',block:'center'});
      },60);
    }

    function openDimensionsToRow(row){
      var combo=qs(page,'.combo-phase-wrap');
      var dims=qs(page,'.dimensions-phase-wrap');
      var chimneyDims=qs(page,'.dimensions-group-chimney');
      var islandDims=qs(page,'.dimensions-group-island');

      finalPhase.style.setProperty('display','none','important');
      if(combo) combo.style.setProperty('display','none','important');
      if(dims) dims.style.setProperty('display','block','important');

      if(chimneyDims){
        var chimney=selectedValue('chimney_position_p');
        chimneyDims.style.setProperty('display',chimney && chimney!=='none' ? 'block' : 'none','important');
      }

      if(islandDims){
        islandDims.style.setProperty('display',selectedValue('island_enabled_p')==='yes' ? 'block' : 'none','important');
      }

      showDimensionHint(row);
      setTimeout(function(){
        row.scrollIntoView({behavior:'smooth',block:'center'});
      },60);
    }

    page.addEventListener("click",function(e){
      var btn=e.target.closest('.phase-next-btn[data-next-phase="final-phase"]');
      if(!btn || !page.contains(btn)) return;

      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();

      clearGateHints();

      var missingQuestion=firstMissingQuestion();
      if(missingQuestion){
        openComboToQuestion(missingQuestion);
        return;
      }

      var missingDimension=firstMissingDimension();
      if(missingDimension){
        openDimensionsToRow(missingDimension);
        return;
      }

      openFinal();
    },true);

    if(back){
      back.addEventListener("click",function(e){
        if(!isFinalVisible()) return;
        e.preventDefault();
        e.stopPropagation();
        closeFinal();
      },true);
    }

    finalPhase.style.setProperty("display","none","important");
  });
})();
