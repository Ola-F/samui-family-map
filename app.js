(function(){
  const data = (window.ATTRACTIONS || []).slice();

  const elList = document.getElementById('list');
  const elSearch = document.getElementById('search');
  const elCategory = document.getElementById('category');
  const elMinScore = document.getElementById('minScore');
  const elReset = document.getElementById('reset');
  const elTagChks = Array.from(document.querySelectorAll('.tagChk'));
  const elBuildDay = document.getElementById('buildDay');
  const elClearDay = document.getElementById('clearDay');
  const elDayMode = document.getElementById('dayMode');
  const elDayLength = document.getElementById('dayLength');
  const elDayPlan = document.getElementById('dayPlan');


  const elMapFrame = document.getElementById('mapFrame');
  const elMapTitle = document.getElementById('mapTitle');
  const elMapFooter = document.getElementById('mapFooter');
  const elOpenMaps = document.getElementById('openMaps');
  const elOpenLink = document.getElementById('openLink');

  function parseDistanceMinutes(distStr){
    if(!distStr) return null;
    // Attempt to get the first number in minutes from a string like "~15–20 דק׳"
    const m = distStr.replace(/[,]/g,'').match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }

  function inferTags(item){
    const tags = new Set();
    const name = (item.name||'').toLowerCase();
    const cat = (item.category||'').toLowerCase();

    const isIndoor = cat.includes('indoor') || name.includes('playroom') || name.includes('kids club') || name.includes('central') || name.includes('tesco') || name.includes('holiday inn');
    const isBeach = cat.includes('beach') || name.includes('beach') || name.includes('bay') || name.includes('silver');
    const isNature = cat.includes('nature') || name.includes('waterfall') || name.includes('garden') || name.includes('park') || name.includes('sanctuary') || name.includes('elephant');
    const isFood = cat.includes('dining') || cat.includes('restaurant') || name.includes('restaurant') || name.includes('club') || name.includes("coco") || name.includes("chi") || name.includes("hacienda") || name.includes("shack");
    const minutes = parseDistanceMinutes(item.distance_min) ?? 999;

    if(isIndoor) tags.add('ממוזג');
    if(isIndoor || cat.includes('creative')) tags.add('טוב ליום גשם');
    // stroller-friendly heuristic
    const strollerBad = name.includes('na muang') || name.includes('secret buddha') || name.includes('paradise park') || name.includes('ang thong');
    if(!strollerBad && (isIndoor || isBeach || isFood)) tags.add('מתאים לעגלה');

    if(minutes <= 20 && !name.includes('ang thong')) tags.add('יום קצר');
    if(minutes >= 45 || name.includes('ang thong')) tags.add('יום ארוך');

    // Helpful extras (not in filter chips, but shown)
    if(isBeach) tags.add('מים/חוף');
    if(isFood) tags.add('אוכל');
    if(isNature) tags.add('טבע/חיות');
    if(cat.includes('creative')) tags.add('יצירה');

    return Array.from(tags);
  }

  function selectedTagFilters(){
    return elTagChks.filter(ch=>ch.checked).map(ch=>ch.value);
  }


  // Build categories
  
  const CATEGORY_LABELS = {
    "Base": "בסיס",
    "Beach": "חופים",
    "Beach Restaurant / Beach Club": "מסעדות חוף וביץ׳ קלאבים",
    "Kids Indoor / Playroom": "משחקיות וממוזג",
    "Playground / Resort Day": "מגרשי משחקים ויום ריזורט",
    "Nature": "טבע",
    "Nature / Culture": "טבע ותרבות",
    "Animals (Ethical)": "חיות (אתרי)",
    "Animals / Viewpoint": "חיות ותצפיות",
    "Creative / Educational": "יצירה וחינוכי",
    "Boat Trip": "שייט וים"
  };
  function categoryLabel(cat){
    return CATEGORY_LABELS[cat] || cat;
  }

  const categories = Array.from(new Set(data.map(x => x.category))).sort((a,b)=>a.localeCompare(b,'he'));
  categories.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = categoryLabel(c);
    elCategory.appendChild(opt);
  });

  function stars(score){
    if(!score) return '';
    return '⭐️'.repeat(Math.max(0, Math.min(5, score)));
  }

  function cardTemplate(item){
    const scoreText = item.score ? stars(item.score) : '';
    const distance = item.distance_min || '';
    const why = item.why || '';
    const reviews = item.reviews || '';
    const cat = item.category || '';
    const link = item.link || '#';

    const tags = inferTags(item);
    const tagsHtml = tags.length ? `<div class="tagChips">${tags.map(t=>`<span class=\"tagChip\">${escapeHtml(t)}</span>`).join('')}</div>` : ``;

    const mapsLink = item.link && item.link.includes('maps.google.com')
      ? item.link
      : `https://maps.google.com/?q=${encodeURIComponent(item.name + ' Koh Samui')}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.setAttribute('tabindex','0');
    wrapper.setAttribute('role','button');
    wrapper.setAttribute('aria-label', `פתח במפה: ${item.name}`);

    wrapper.innerHTML = `
      <div class="cardHeader">
        <div class="name">${escapeHtml(item.name)}</div>
        <div class="score">${scoreText}</div>
      </div>
      <div class="meta">
        <div class="chip">קטגוריה: ${escapeHtml(categoryLabel(cat))}</div>
        ${distance ? `<div class="chip">מרחק: ${escapeHtml(distance)}</div>` : ``}
      </div>
      ${tagsHtml}
      <div class="desc"><strong>למה שווה:</strong> ${escapeHtml(why)}</div>
      <div class="muted"><strong>תמצית ביקורות/מה מצפים:</strong> ${escapeHtml(reviews)}</div>
      <div class="links">
        <a href="${mapsLink}" target="_blank" rel="noopener">מפה (Google Maps)</a>
        <a href="${link}" target="_blank" rel="noopener">קישור להתרשם</a>
      </div>
    `;

    function openOnMap(){
      const q = item.link && item.link.includes('maps.google.com/?q=')
        ? decodeURIComponent(item.link.split('maps.google.com/?q=')[1] || item.name)
        : item.name;

      const embed = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
      elMapFrame.src = embed;
      elMapTitle.textContent = item.name;
      elMapFooter.textContent = `${item.category}${item.distance_min ? ' · ' + item.distance_min : ''}${item.score ? ' · ' + stars(item.score) : ''}`;

      elOpenMaps.href = `https://maps.google.com/?q=${encodeURIComponent(q)}`;
      elOpenLink.href = item.link || elOpenMaps.href;
    }

    wrapper.addEventListener('click', openOnMap);
    wrapper.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        openOnMap();
      }
    });

    return wrapper;
  }

  function escapeHtml(str){
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function matches(item, q){
    if(!q) return true;
    const hay = (item.name + ' ' + item.category + ' ' + item.why + ' ' + item.reviews).toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function render(){
    elList.innerHTML = '';
    const q = elSearch.value.trim();
    const cat = elCategory.value;
    const minScore = parseInt(elMinScore.value, 10) || 0;
    const selTags = selectedTagFilters();

    const filtered = data.filter(item=>{
      const okQ = matches(item, q);
      const okCat = (cat === 'all') ? true : item.category === cat;
      const s = item.score || 0;
      const okScore = s >= minScore;
      const tags = inferTags(item);
      const okTags = selTags.length ? selTags.every(t=>tags.includes(t)) : true;
      return okQ && okCat && okScore && okTags;
    });

    // Group by category in the list (but keep cards)
    const byCat = new Map();
    filtered.forEach(it=>{
      if(!byCat.has(it.category)) byCat.set(it.category, []);
      byCat.get(it.category).push(it);
    });

    Array.from(byCat.keys()).sort((a,b)=>a.localeCompare(b,'he')).forEach(c=>{
      const h = document.createElement('div');
      h.className = 'chip';
      h.style.margin = '6px 0 2px';
      h.style.display = 'inline-block';
      h.textContent = `קטגוריה: ${c} · ${byCat.get(c).length}`;
      elList.appendChild(h);

      // sort within category by score desc then name
      const items = byCat.get(c).slice().sort((a,b)=>{
        const sa = a.score || 0, sb = b.score || 0;
        if(sb !== sa) return sb - sa;
        return (a.name||'').localeCompare(b.name||'', 'he');
      });

      items.forEach(it => elList.appendChild(cardTemplate(it)));
    });

    if(filtered.length === 0){
      const empty = document.createElement('div');
      empty.className = 'summary';
      empty.textContent = 'לא נמצאו תוצאות. נסי חיפוש אחר או הורידי סינון.';
      elList.appendChild(empty);
    }
  }

  elSearch.addEventListener('input', render);
  elCategory.addEventListener('change', render);
  elMinScore.addEventListener('change', render);
  
  // Tag filters
  elTagChks.forEach(ch=>{
    ch.addEventListener('change', ()=>render());
  });

  // Day builder
  function buildDayPlan(){
    const mode = elDayMode.value;
    const hours = parseInt(elDayLength.value,10) || 3;
    const targetMinutes = hours * 60;

    const items = data.map(it=>({it, tags: inferTags(it)}));

    function modeOk(x){
      const tags = x.tags;
      if(mode==='rain') return tags.includes('ממוזג') || tags.includes('טוב ליום גשם');
      if(mode==='hot') return tags.includes('ממוזג') || tags.includes('מים/חוף');
      if(mode==='tired') return tags.includes('יום קצר');
      return true;
    }

    const ranked = items
      .filter(modeOk)
      .map(x=>{
        const mins = parseDistanceMinutes(x.it.distance_min) ?? 999;
        const score = x.it.score || 0;
        return {...x, mins, score, isFood: x.tags.includes('אוכל')};
      })
      .sort((a,b)=>{
        if(b.score!==a.score) return b.score-a.score;
        return a.mins-b.mins;
      });

    if(!ranked.length){
      elDayPlan.innerHTML = `<div class="planTitle">לא נמצאו הצעות למסלול לפי הסינון.</div>`;
      return;
    }

    const chosen = [];
    let total = 0;

    function addIf(x, minutes){
      if(chosen.some(c=>c.it.name===x.it.name)) return;
      chosen.push(x);
      total += minutes;
    }

    for(const x of ranked){
      if(!x.isFood){
        addIf(x, 75);
        break;
      }
    }
    for(const x of ranked){
      if(x.isFood){
        addIf(x, 60);
        break;
      }
    }
    for(const x of ranked){
      if(total >= targetMinutes - 45) break;
      if(chosen.length >= 4) break;
      addIf(x, 60);
    }

    const titleMap = {any:'כללי', hot:'חם מאוד', rain:'גשום', tired:'עייפים'};
    const title = `מסלול מוצע (${hours} שעות, מצב: ${titleMap[mode]||'כללי'})`;

    const list = chosen.map((x)=>{
      const mapsLink = x.it.link && x.it.link.includes('maps.google.com')
        ? x.it.link
        : `https://maps.google.com/?q=${encodeURIComponent(x.it.name + ' Koh Samui')}`;
      const shortWhy = x.it.why || '';
      const dist = x.it.distance_min ? ` · ${x.it.distance_min}` : '';
      return `<li><a href="#" data-name="${escapeHtml(x.it.name)}" class="planPick">${escapeHtml(x.it.name)}</a><span class="muted">${escapeHtml(dist)}</span><br/><span class="muted">${escapeHtml(shortWhy)}</span><br/><a href="${mapsLink}" target="_blank" rel="noopener">פתח במפות</a></li>`;
    }).join('');

    elDayPlan.innerHTML = `<div class="planTitle">${escapeHtml(title)}</div><ol>${list}</ol>`;
    elDayPlan.querySelectorAll('.planPick').forEach(a=>{
      a.addEventListener('click', (e)=>{
        e.preventDefault();
        const name = a.getAttribute('data-name');
        const found = data.find(d=>d.name===name);
        if(found){
          selectItem(found);
          window.scrollTo({top: 0, behavior: 'smooth'});
        }
      });
    });
  }

  if(elBuildDay){
    elBuildDay.addEventListener('click', buildDayPlan);
  }
  if(elClearDay){
    elClearDay.addEventListener('click', ()=>{
      elDayPlan.innerHTML = '';
      elDayMode.value='any';
      elDayLength.value='3';
    });
  }

elReset.addEventListener('click', ()=>{
    elSearch.value = '';
    elCategory.value = 'all';
    elMinScore.value = '0';
    render();
  });

  // Initial selection: base
  render();
})();