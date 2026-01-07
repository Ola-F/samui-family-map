
(function(){
  const raw = (window.ATTRACTIONS || []).slice();

  const TAG_LABELS = {
    aircon: "ממוזג",
    rain: "טוב ליום גשם",
    stroller: "מתאים לעגלה",
    drive_under_20: "עד 20 ד׳ נסיעה",
    drive_over_20: "מעל 20 ד׳ נסיעה",
    water: "מים/ים",
    food: "אוכל",
    nature: "טבע",
    creative: "יצירה",
    animals: "חיות"
  };

  const TAG_ORDER = ["drive_under_20","drive_over_20","aircon","rain","stroller","water","food","nature","animals","creative"];

  const elSearch = document.getElementById("search");
  const elCategory = document.getElementById("category");
  const elMinScore = document.getElementById("minScore");
  const elSortBy = document.getElementById("sortBy");
  const elTags = document.getElementById("tags");
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
    if(score == null) return "";
    const s = Math.max(0, Math.min(5, Number(score)));
    return "★".repeat(s) + "☆".repeat(5 - s);
  }

  function unique(arr){
    return Array.from(new Set(arr));
  }

  // Category dropdown
  const categories = unique(raw.filter(x=>!isBase(x)).map(x => x.category_he || x.category)).sort((a,b)=>a.localeCompare(b,'he'));
  elCategory.innerHTML = `<option value="">כל הקטגוריות</option>` + categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  // Tag checkboxes (only those actually exist)
  const presentTags = unique(raw.flatMap(x => (x.tags || [])));
  const tagsToShow = TAG_ORDER.filter(t => presentTags.includes(t)).concat(presentTags.filter(t => !TAG_ORDER.includes(t))).filter(Boolean);

  elTags.innerHTML = tagsToShow.map(tagKey => {
    const label = TAG_LABELS[tagKey] || tagKey;
    return `<label class="tag"><input type="checkbox" value="${escapeHtml(tagKey)}"> ${escapeHtml(label)}</label>`;
  }).join("");

  const tagInputs = Array.from(elTags.querySelectorAll('input[type="checkbox"]'));

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
    const mainImg = (item.images && item.images[0]) ? item.images[0] : "";
    const tags = (item.tags || []).map(t => TAG_LABELS[t] || t);

    const tagChips = tags.slice(0, 5).map(t => `<span class="badge soft"><span class="emoji">🏷️</span>${escapeHtml(t)}</span>`).join("");

    return `
      <article class="card" tabindex="0" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(item.name)}">
        <div class="cardTop">
          <div class="thumb">
            ${mainImg ? `<img alt="" loading="lazy" src="${escapeHtml(mainImg)}">` : ``}
            <button class="galleryBtn" data-action="gallery" data-id="${escapeHtml(id)}" type="button">תמונות</button>
          </div>

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

  function resetAll(){
    elSearch.value = "";
    elCategory.value = "";
    elMinScore.value = "0";
    elSortBy.value = "score_desc";
    tagInputs.forEach(i => i.checked = false);
    render();
  }

  function buildDay(){
    const mode = elMode.value;
    const items = raw.filter(x => !isBase(x));

    const hasTag = (it, t) => (it.tags || []).includes(t);
    const score = (it) => Number(it.score) || 0;
    const mins = (it) => parseMin(it.distance_min) ?? 9999;

    let pool = items.slice();

    if(mode === "hot"){
      pool = pool.filter(it => hasTag(it, "aircon") || hasTag(it, "water"));
    } else if(mode === "rain"){
      pool = pool.filter(it => hasTag(it, "rain") || hasTag(it, "aircon"));
    } else if(mode === "tired"){
      pool = pool.filter(it => hasTag(it, "short")).sort((a,b)=> mins(a) - mins(b));
    }

    // Choose 3 items: higher score first, then closer
    pool.sort((a,b)=> (score(b) - score(a)) || (mins(a) - mins(b)));

    const chosen = pool.slice(0, 3);
    if(chosen.length === 0){
      alert("לא מצאתי מסלול מתאים למסננים. נסי מצב אחר 🙂");
      return;
    }

    // Highlight by pre-filling filters: set tags and min score for a nicer experience
    resetAll();
    // set category to "הכול"
    elMinScore.value = "4";

    // Create a small “focus” sequence: set map to first and scroll
    setMap(chosen[0]);
    // Render only chosen list (temporary)
    elCount.textContent = `מסלול מומלץ (2–4 שעות): ${chosen.length} עצירות`;
    elCards.innerHTML = chosen.map((x)=>cardHtml(x, 0)).join("");

    // attach listeners again
    Array.from(document.querySelectorAll("[data-action='focus']")).forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const item = chosen.find(i => i._id === id);
        if(item) setMap(item);
      });
    });
    Array.from(document.querySelectorAll(".card")).forEach(card=>{
      card.addEventListener("click", (e)=>{
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
        if(tag === "a" || tag === "button" || tag === "input") return;
        const id = card.getAttribute("data-id");
        const item = chosen.find(i => i._id === id);
        if(item) setMap(item);
      });
    });
    Array.from(document.querySelectorAll("[data-action='gallery']")).forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const item = chosen.find(i => i._id === id);
        if(item) openGallery(item);
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
  elTags.addEventListener("change", render);
  elReset.addEventListener("click", resetAll);
  elBuild.addEventListener("click", buildDay);

  elModalOverlay.addEventListener("click", closeGallery);
  elCloseModal.addEventListener("click", closeGallery);
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && elModal.getAttribute("aria-hidden") === "false") closeGallery();
  });

  // Initial map should be base if exists
  const base = raw.find(isBase);
  if(base){
    setMap(base);
  }

  render();
})();
