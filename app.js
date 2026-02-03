
(function(){
  const raw = (window.ATTRACTIONS || []).slice();

  const TAG_LABELS = {
    ac: "ממוזג",
    water: "מים",
    day_pass: "Day Pass",
    drive_under_20: "עד 20 ד׳ נסיעה",
    drive_over_20: "מעל 20 ד׳ נסיעה"
    ,
    supermarket: "סופרים",
    mall: "קניון",
    shopping: "קניות"
}
  ;

  const TAG_ORDER = ["ac","water","drive_under_20","drive_over_20"];

  const elSearch = document.getElementById("search");
  const elCategory = document.getElementById("category");
  const elMinScore = document.getElementById("minScore");
  const elSortBy = document.getElementById("sortBy");
  const elTags = document.getElementById("tags");
  const elDestination = document.getElementById("destination");
  const elCards = document.getElementById("cards");
  const elCount = document.getElementById("count");
  const elReset = document.getElementById("resetBtn");

  const elMap = document.getElementById("map");
  const elOpenMaps = document.getElementById("openMaps");

  const elMode = document.getElementById("mode");
  const elBuild = document.getElementById("buildBtn");

  const elModal = document.getElementById("modal");
  const elModalOverlay = document.getElementById("modalOverlay");
  const elCloseModal = document.getElementById("closeModal");
  const elModalTitle = document.getElementById("modalTitle");
  const elModalGrid = document.getElementById("modalGrid");

  // How-to modal
  const elHowToBtn = document.getElementById("openHowTo");
  const elHowTo = document.getElementById("howtoModal");
  const elHowToOverlay = document.getElementById("howtoOverlay");
  const elCloseHowTo = document.getElementById("closeHowTo");


  function isBase(item){
    return (item.category_he || item.category) === "בסיס" || (item.category === "Base") || /base/i.test(item.name);
  }

  function parseMin(distanceText){
    if(!distanceText) return null;
    const t = String(distanceText);
    // Handles: "10–15 דק׳" or "55–65 דקות" or "15 דק׳"
    let m = t.match(/(\d+)\s*[–-]\s*(\d+)/);
    if(m) return parseInt(m[1], 10);
    m = t.match(/(\d+)/);
    if(m) return parseInt(m[1], 10);
    return null;
  }

  function stars(score){
    if(score === "check") return `<span class="checkBadge"><span class="checkIcon">?</span><span class="checkText">(לבדיקה)</span></span>`;
    if(score == null) return "";
    const n = Number(score);
    if(Number.isNaN(n)) return "";
    const s = Math.max(0, Math.min(5, n));
    return "★".repeat(s) + "☆".repeat(5 - s);
  }

  function unique(arr){
    return Array.from(new Set(arr));
  }

  // Category dropdown (destination-aware)
  function populateCategories(dest){
    const cats = unique(raw.filter(x=>!isBase(x)).filter(x=>(x.destination||'koh_samui')===dest).map(x => x.category_he || x.category)).sort((a,b)=>a.localeCompare(b,'he'));
    elCategory.innerHTML = `<option value="">כל הקטגוריות</option>` + cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }

  let currentDestination = "koh_samui";
  if(elDestination && elDestination.value) currentDestination = elDestination.value;
  populateCategories(currentDestination);

  // Tag checkboxes (locked to approved Hebrew tags only)
  const tagsToShow = TAG_ORDER.slice();

  elTags.innerHTML = tagsToShow.map(tagKey => {
    const label = TAG_LABELS[tagKey] || tagKey;
    return `<label class="tag"><input type="checkbox" value="${escapeHtml(tagKey)}"> ${escapeHtml(label)}</label>`;
  }).join("");

  const tagInputs = Array.from(elTags.querySelectorAll('input[type="checkbox"]'));

  const DEST_DEFAULT_MAP = {
    koh_samui: "https://www.google.com/maps?q=The%20Gardens%20by%20Samui%20Beach%20Properties%20Bang%20Rak&output=embed",
    bangkok: "https://www.google.com/maps?q=Gate43%20Airport%20Hotel%20Bangkok&output=embed"
  };


  function escapeHtml(s){
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function buildMapEmbed(linkOrName){
    const base = "https://www.google.com/maps";
    if(linkOrName && String(linkOrName).includes("google.com/maps")){
      // Use embed based on query param if possible
      const url = new URL(linkOrName);
      const q = url.searchParams.get("q");
      if(q){
        return `${base}?q=${encodeURIComponent(q)}&output=embed`;
      }
    }
    const q = linkOrName || "Koh Samui";
    return `${base}?q=${encodeURIComponent(q)}&output=embed`;
  }

  function openMapHref(linkOrName){
    if(linkOrName && String(linkOrName).includes("google.com/maps")) return linkOrName;
    return `https://www.google.com/maps?q=${encodeURIComponent(linkOrName || "Koh Samui")}`;
  }

  function setDefaultMap(){
    elMap.src = DEST_DEFAULT_MAP[currentDestination] || DEST_DEFAULT_MAP.koh_samui;
  }

  function setMap(item){
    const q = item.link && item.link.includes("google.com/maps") ? item.link : item.name;
    elMap.src = buildMapEmbed(q);
    elOpenMaps.href = openMapHref(q);
  }

  function matchesSearch(item, q){
    if(!q) return true;
    const hay = [
      item.name, item.category_he, item.why, item.reviews,
      (item.tags||[]).map(t => TAG_LABELS[t] || t).join(" ")
    ].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function matchesTags(item, selectedTags){
    if(selectedTags.length === 0) return true;
    const tags = item.tags || [];
    return selectedTags.every(t => tags.includes(t));
  }

  function sortItems(items){
    const mode = elSortBy.value;
    const copy = items.slice();
    if(mode === "distance_asc"){
      copy.sort((a,b)=> (parseMin(a.distance_min)??9999) - (parseMin(b.distance_min)??9999));
      return copy;
    }
    if(mode === "name_asc"){
      copy.sort((a,b)=> String(a.name).localeCompare(String(b.name), 'he'));
      return copy;
    }
    // score desc
    copy.sort((a,b)=> (Number(b.score)||0) - (Number(a.score)||0));
    return copy;
  }

  function render(){
    const q = elSearch.value.trim();
    const cat = elCategory.value;
    const minScore = Number(elMinScore.value || 0);
    const selectedTags = tagInputs.filter(i=>i.checked).map(i=>i.value);

    let items = raw.filter(x => !isBase(x));

    // destination filter
    items = items.filter(x => (x.destination || 'koh_samui') === currentDestination);

    items = items.filter(x => matchesSearch(x, q));
    if(cat) items = items.filter(x => (x.category_he || x.category) === cat);
    if(minScore > 0) items = items.filter(x => (Number(x.score)||0) >= minScore);
    items = items.filter(x => matchesTags(x, selectedTags));

    items = sortItems(items);

    elCount.textContent = `${items.length} תוצאות`;

    elCards.innerHTML = items.map((x, idx) => cardHtml(x, idx)).join("");

    // attach listeners
    Array.from(document.querySelectorAll("[data-action='focus']")).forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const item = items.find(i => i._id === id);
        if(item) setMap(item);
      });
    });

    Array.from(document.querySelectorAll(".card")).forEach(card=>{
      card.addEventListener("click", (e)=>{
        // ignore clicks on buttons/links
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
        if(tag === "a" || tag === "button" || tag === "input") return;
        const id = card.getAttribute("data-id");
        const item = items.find(i => i._id === id);
        if(item) setMap(item);
      });
      card.addEventListener("keydown", (e)=>{
        if(e.key === "Enter"){
          const id = card.getAttribute("data-id");
          const item = items.find(i => i._id === id);
          if(item) setMap(item);
        }
      });
    });

    Array.from(document.querySelectorAll("[data-action='gallery']")).forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const item = items.find(i => i._id === id);
        if(item) openGallery(item);
      });
    });

    Array.from(document.querySelectorAll("[data-action='openLink']")).forEach(a=>{
      a.addEventListener("click", (e)=>{ e.stopPropagation(); });
    });
  }

  function cardHtml(item, idx){
    // stable id (avoid recompute)
    const id = item._id;
    const cat = item.category_he || item.category;
    const icon = item.icon || "✨";
    const dist = item.distance_min || "";
    const score = item.score;
    const starsText = stars(score);
    const metaParts = [];
    if(item.cuisine) metaParts.push(`מטבח: ${escapeHtml(item.cuisine)}`);
    if(item.price) metaParts.push(`מחיר: ${escapeHtml(item.price)}`);
    const metaLine = metaParts.length ? `<div class="line"><div class="k">פרטים</div><div class="v">${metaParts.join(" · ")}</div></div>` : "";
    const metaText = "";

    const hoursLine = item.hours ? `<div class="line"><div class="k">שעות</div><div class="v">${item.hours === 'לבדיקה' ? '<span class="checkBadge">❓</span> לבדיקה' : escapeHtml(item.hours)}</div></div>` : ``;
    let phoneLine = ``;
    if(item.phone){
      if(item.phone === "לבדיקה"){
        phoneLine = `<div class="line"><div class="k">טלפון</div><div class="v"><span class="qmark">❓</span> לבדיקה</div></div>`;
      } else {
        const ph = escapeHtml(item.phone);
        phoneLine = `<div class="line"><div class="k">טלפון</div><div class="v"><a class="tel" href="tel:${ph}">${ph}</a></div></div>`;
      }
    }

    const dayPassBlock = (item.day_pass_lines && item.day_pass_lines.length)
      ? `<div class="line"><div class="k">Day Pass</div><div class="v"><ul class="bullets">${item.day_pass_lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul></div></div>`
      : ``;


    const mainImg = (item.images && item.images[0]) ? item.images[0] : "";
    const rawTags = (item.tags || []);
    const tags = rawTags.filter(t => TAG_LABELS[t]).map(t => TAG_LABELS[t]);

    const tagsForChips = rawTags.filter(t => TAG_LABELS[t] && !["drive_under_20","drive_over_20"].includes(t)).map(t => TAG_LABELS[t]);

    const tagChips = tagsForChips.slice(0, 5).map(t => `<span class="badge tag"><span class="emoji">🏷️</span>${escapeHtml(t)}</span>`).join("");

    return `
      <article class="card" tabindex="0" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(item.name)}">
        <div class="cardTop">
          <div class="cardMain">
            <div class="cardTitleRow">
              <h3 class="cardTitle">${escapeHtml(icon)} ${escapeHtml(item.name)}</h3>
              ${score ? `<div class="stars" title="ציון">${starsText}</div>` : ``}
            </div>

            <div class="badges">
              <span class="badge"><span class="emoji">📌</span>${escapeHtml(cat)}</span>
              ${dist ? `<span class="badge"><span class="emoji">🚗</span>${escapeHtml(dist)}</span>` : ``}
              ${tagChips}
            </div>
          </div>
        </div>

        <div class="cardBody">
          ${hoursLine}
          ${phoneLine}
          ${metaLine}
          ${dayPassBlock}
          <div class="line"><div class="k">למה שווה</div><div class="v">${escapeHtml(item.why || "")}</div></div>
          <div class="line"><div class="k">תמצית ביקורות</div><div class="v">${escapeHtml(item.reviews || "")}</div></div>
        </div>

        <div class="cardLinks">
          <a class="linkBtn" data-action="openLink" target="_blank" rel="noopener" href="${escapeHtml(item.link || "#")}">קישור להתרשמות</a>
          <a class="linkBtn" data-action="openLink" target="_blank" rel="noopener" href="${escapeHtml(openMapHref(item.link && item.link.includes('google.com/maps') ? item.link : item.name))}">פתחי מפה</a>
          <button class="linkBtn" data-action="focus" data-id="${escapeHtml(id)}" type="button">מקד במפה</button>
        </div>
      </article>
    `;
  }

  function openGallery(item){
    const imgs = (item.images || []).slice(0, 4);
    elModalTitle.textContent = `תמונות – ${item.name}`;
    elModalGrid.innerHTML = imgs.map(src => `<img loading="lazy" alt="" src="${escapeHtml(src)}">`).join("");
    elModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeGallery(){
    elModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openHowTo(){
    if(!elHowTo) return;
    elHowTo.setAttribute("aria-hidden","false");
    elHowTo.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  function closeHowTo(){
    if(!elHowTo) return;
    elHowTo.setAttribute("aria-hidden","true");
    elHowTo.style.display = "none";
    document.body.style.overflow = "";
  }

  function resetAll(){
    const dest = (elDestination && elDestination.value) || currentDestination || "koh_samui";
    elSearch.value = "";
    elCategory.value = "";
    elMinScore.value = "0";
    elSortBy.value = "score_desc";
    tagInputs.forEach(i => i.checked = false);
    if(elDestination) elDestination.value = dest;
    currentDestination = dest;
    render();
  }

    function buildDay(){
    const mode = elMode.value;

    // Destination-aware pool
    const poolAll = raw.filter(x => !isBase(x) && (x.destination || "koh_samui") === currentDestination);

    const isRestaurant = (it) => (it.category_he === "מסעדות" || it.category_he === "מסעדות חוף");
    const isAttraction = (it) => !isRestaurant(it);

    const pickByNames = (names) => names.map(n => poolAll.find(x => x.name === n)).filter(Boolean);

    // Curated full-day options (2–3) per destination
    const plans = [];
    if(currentDestination === "bangkok"){
      plans.push({
        title: "יום רגוע ליד המלון",
        stops: [
          {label:"בוקר", name:"Siam Serpentarium"},
          {label:"צהריים", name:"Thai-Kor (The Paseo Mall)"},
          {label:"אחה״צ", name:"Hua Takhe Old Market"},
          {label:"ערב", name:"The First Lounge (Gate43 Hotel Restaurant)"}
        ]
      });
      plans.push({
        title: "יום אאוטלטים קלילים (קרוב לשדה)",
        stops: [
          {label:"בוקר", name:"Central Village – Bangkok Luxury Outlet"},
          {label:"צהריים", name:"The First Lounge (Gate43 Hotel Restaurant)"},
          {label:"אחה״צ", name:"Siam Premium Outlets Bangkok"},
          {label:"ערב", name:"Chocolate Ville"}
        ]
      });
      plans.push({
        title: "יום משחקים + קניון",
        stops: [
          {label:"בוקר", name:"HarborLand – MEGA Bangna"},
          {label:"צהריים", name:"Sizzler (Mega Bangna)"},
          {label:"אחה״צ", name:"MEGA Bangna (קניון)"},
          {label:"ערב", name:"Chocolate Ville"}
        ]
      });
    } else {
      // Koh Samui: build from high-score items, destination filtered
      const hasTag = (it, t) => (it.tags || []).includes(t);
      const score = (it) => Number(it.score) || 0;
      const mins = (it) => parseMin(it.distance_min) ?? 9999;

      let pool = poolAll.filter(isAttraction);

      if(mode === "hot"){
        pool = pool.filter(it => hasTag(it, "ac") || hasTag(it, "water"));
      } else if(mode === "rain"){
        pool = pool.filter(it => hasTag(it, "rain") || hasTag(it, "ac"));
      } else if(mode === "tired"){
        pool = pool.filter(it => hasTag(it, "short")).sort((a,b)=> mins(a) - mins(b));
      }

      pool.sort((a,b)=> (score(b) - score(a)) || (mins(a) - mins(b)));

      const morning = pool[0];
      const afternoon = pool[1] || pool[0];

      const restaurants = poolAll.filter(isRestaurant).sort((a,b)=> (score(b)-score(a)) || (mins(a)-mins(b)));
      const lunch = restaurants[0];
      const dinner = restaurants[1] || restaurants[0];

      if(!morning){
        alert("לא מצאתי מספיק נתונים לבניית יום. נסי לשנות מצב 🙂");
        return;
      }

      plans.push({
        title: "יום מומלץ (אוטומטי)",
        stops: [
          {label:"בוקר", name: morning.name},
          {label:"צהריים", name: lunch ? lunch.name : "—"},
          {label:"אחה״צ", name: afternoon.name},
          {label:"ערב", name: dinner ? dinner.name : "—"}
        ]
      });
    }

    // Render plans
    const planHtml = (plan) => {
      const items = plan.stops.map(s => {
        const it = poolAll.find(x => x.name === s.name);
        if(!it){
          return `<div class="dayStop"><div class="dayLabel">${escapeHtml(s.label)}</div><div class="dayName">—</div></div>`;
        }
        return `<div class="dayStop">
          <div class="dayLabel">${escapeHtml(s.label)}</div>
          <a href="#" class="dayName" data-action="focus" data-id="${escapeHtml(it._id)}">${escapeHtml(it.name)}</a>
        </div>`;
      }).join("");
      return `<div class="dayPlan">
        <div class="dayPlanTitle">🗓️ ${escapeHtml(plan.title)}</div>
        <div class="dayStops">${items}</div>
      </div>`;
    };

    // Reset list UI and show plans
    resetAll();
    elCount.textContent = `בנה לי יום: ${plans.length} אפשרויות`;
    elCards.innerHTML = plans.map(planHtml).join("");

    // Focus listeners
    Array.from(document.querySelectorAll("[data-action='focus']")).forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const item = raw.find(i => i._id === id);
        if(item){
          setMap(item);
          // scroll a bit on mobile for map visibility
          if(window.innerWidth < 900){
            document.querySelector(".mapPane")?.scrollIntoView({behavior:"smooth"});
          }
        }
      });
    });

    window.scrollTo({top: 0, behavior: "smooth"});
  }


  // Assign stable ids
  raw.forEach((it, idx)=>{
    it._id = `${idx}-${(it.name||"").replace(/\s+/g,'-').slice(0,24)}`;
  });

  // Wire events
  [elSearch, elCategory, elMinScore, elSortBy].forEach(el => el.addEventListener("input", render));
  if(elDestination){
    elDestination.addEventListener("change", ()=>{
      currentDestination = elDestination.value || "koh_samui";
      populateCategories(currentDestination);
      // reset category selection when switching destination
      elCategory.value = "";
      resetAll();
      // keep destination selection
      if(elDestination) elDestination.value = currentDestination;
      setDefaultMap();
      render();
    });
  }
  elTags.addEventListener("change", render);
  elReset.addEventListener("click", resetAll);
  elBuild.addEventListener("click", buildDay);

  elModalOverlay.addEventListener("click", closeGallery);
  elCloseModal.addEventListener("click", closeGallery);

  // How-to modal listeners
  if(elHowToBtn) elHowToBtn.addEventListener("click", openHowTo);
  if(elHowToOverlay) elHowToOverlay.addEventListener("click", closeHowTo);
  if(elCloseHowTo) elCloseHowTo.addEventListener("click", closeHowTo);
  document.addEventListener("keydown", (e)=>{
    if(e.key !== "Escape") return;
    if(elModal && elModal.getAttribute("aria-hidden") === "false") closeGallery();
    if(elHowTo && elHowTo.getAttribute("aria-hidden") === "false") closeHowTo();
  });

  // Initial map should be base if exists
  const base = raw.find(isBase);
  if(base){
    setMap(base);
  }

  render();
})();
