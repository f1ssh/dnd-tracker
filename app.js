// State management and rendering

// Default character template
const defaultCharacter = {
  meta: { version: 1 },
  identity: {
    name: "New Hero",
    class: "Barbarian",
    level: 1,
    race: "Human",
    background: "",
    alignment: ""
  },
  combat: {
    ac: 10,
    initiative: 0,
    speed: 30,
    hp: { max: 10, current: 10, temp: 0 },
    hitDice: { die: "d12", total: 1, remaining: 1 },
    conditions: []
  },
  abilities: { STR: 15, DEX: 14, CON: 14, INT: 8, WIS: 10, CHA: 10 },
  proficiencyBonus: 2,
  saves: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
  skills: {},
  spells: { casterType: "none", slots: {} },
  classResources: {
    Barbarian: { rage: { max: 2, used: 0 }, rageDamage: 2 },
    Fighter: { secondWind: { available: true }, actionSurge: { uses: 1, max: 1 }, indomitable: { uses: 0, max: 1 } },
    Monk: { ki: { max: 1, used: 0 } },
    Paladin: { layOnHands: { max: 5, remaining: 5 }, channelDivinity: { max: 1, used: 0 } },
    Cleric: { channelDivinity: { max: 1, used: 0 } },
    Wizard: { arcaneRecovery: { available: true } }
  },
  notes: "",
  log: []
};

// Skills list
const SKILLS = [
  { name: "Acrobatics", ability: "DEX" },
  { name: "Animal Handling", ability: "WIS" },
  { name: "Arcana", ability: "INT" },
  { name: "Athletics", ability: "STR" },
  { name: "Deception", ability: "CHA" },
  { name: "History", ability: "INT" },
  { name: "Insight", ability: "WIS" },
  { name: "Intimidation", ability: "CHA" },
  { name: "Investigation", ability: "INT" },
  { name: "Medicine", ability: "WIS" },
  { name: "Nature", ability: "INT" },
  { name: "Perception", ability: "WIS" },
  { name: "Performance", ability: "CHA" },
  { name: "Persuasion", ability: "CHA" },
  { name: "Religion", ability: "INT" },
  { name: "Sleight of Hand", ability: "DEX" },
  { name: "Stealth", ability: "DEX" },
  { name: "Survival", ability: "WIS" }
];

// Class configuration
const CLASS_CONFIG = {
  Barbarian: {
    panels: [
      { type: "counter", key: "classResources.Barbarian.rage", label: "Rages", per: "Long Rest" },
      { type: "static", label: "Rage Damage Bonus shown when raging" }
    ],
    caster: false
  },
  Fighter: {
    panels: [
      { type: "toggle", key: "classResources.Fighter.secondWind.available", label: "Second Wind (Short Rest)" },
      { type: "counter", key: "classResources.Fighter.actionSurge", label: "Action Surge", per: "Short Rest" },
      { type: "counter", key: "classResources.Fighter.indomitable", label: "Indomitable", per: "Long Rest" }
    ],
    caster: false
  },
  Monk: {
    panels: [ { type: "counter", key: "classResources.Monk.ki", label: "Ki Points", per: "Short Rest" } ],
    caster: false
  },
  Paladin: {
    panels: [
      { type: "pool", key: "classResources.Paladin.layOnHands", label: "Lay on Hands", per: "Long Rest" },
      { type: "counter", key: "classResources.Paladin.channelDivinity", label: "Channel Divinity", per: "Long Rest" }
    ],
    caster: true
  },
  Cleric: {
    panels: [ { type: "counter", key: "classResources.Cleric.channelDivinity", label: "Channel Divinity", per: "Short Rest" } ],
    caster: true
  },
  Wizard: {
    panels: [ { type: "toggle", key: "classResources.Wizard.arcaneRecovery.available", label: "Arcane Recovery Available" } ],
    caster: true
  }
};

let character = loadCharacter();
let ui = loadUI();

// Utility helpers
function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((o, k) => (o[k] = o[k] || {}), obj);
  target[last] = value;
}

function loadCharacter() {
  const saved = localStorage.getItem('dndCharacter');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return JSON.parse(JSON.stringify(defaultCharacter));
}

let saveTimer;
function saveCharacter() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem('dndCharacter', JSON.stringify(character));
  }, 150);
}

function loadUI() {
  const saved = localStorage.getItem('dndUI');
  return saved ? JSON.parse(saved) : { collapsed: {} };
}

function saveUI() {
  localStorage.setItem('dndUI', JSON.stringify(ui));
}

function applyChange(mutator, logText) {
  mutator();
  if (logText) logAction(logText);
  saveCharacter();
  render();
}

function logAction(text) {
  const time = new Date().toLocaleTimeString();
  character.log.unshift(`${time} - ${text}`);
  character.log = character.log.slice(0, 20);
}

function panel(parentId, id, title) {
  const parent = document.getElementById(parentId);
  const wrapper = document.createElement('div');
  wrapper.className = 'bg-white p-4 rounded-xl shadow border border-gray-100';
  const collapsed = ui.collapsed[id];
  wrapper.innerHTML = `
    <h2 class="font-semibold text-gray-800 text-lg mb-3 flex items-center justify-between">
      <span class="flex items-center gap-2"><span class="inline-block w-1.5 h-5 rounded bg-indigo-500"></span> ${title}</span>
      <button type="button" class="chip-btn toggle" data-id="${id}">${collapsed ? '▸' : '▾'}</button>
    </h2>
    <div class="panel-body ${collapsed ? 'hidden' : ''}"></div>
  `;
  parent.appendChild(wrapper);
  wrapper.querySelector('.toggle').addEventListener('click', e => {
    const pid = e.target.dataset.id;
    ui.collapsed[pid] = !ui.collapsed[pid];
    saveUI();
    render();
  });
  return wrapper.querySelector('.panel-body');
}

function toast(msg) {
  const root = document.getElementById('toastRoot');
  const t = document.createElement('div');
  t.className = 'px-3 py-2 rounded-lg shadow bg-gray-900 text-white text-sm';
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => { t.remove(); }, 1600);
}

function confirmModal(title, body) {
  return new Promise(resolve => {
    const root = document.getElementById('modalRoot');
    root.classList.remove('hidden');
    root.classList.add('flex');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = body;
    const off = () => { root.classList.add('hidden'); root.classList.remove('flex'); };
    const ok = () => { off(); resolve(true); };
    const cancel = () => { off(); resolve(false); };
    document.getElementById('modalOk').onclick = ok;
    document.getElementById('modalCancel').onclick = cancel;
  });
}

// Rendering
function render() {
  document.getElementById('app').innerHTML = `
    <div id="left" class="space-y-4"></div>
    <div id="middle" class="space-y-4"></div>
    <div id="right" class="space-y-4"></div>
  `;
  renderHeader();
  renderHP();
  renderCombat();
  renderAbilities();
  renderSkills();
  renderClassPanels();
  renderSpells();
  renderNotes();
  renderDice();
  renderImportExport();
  renderLog();
}

// Header panel
function renderHeader() {
  const body = panel('left', 'header', 'Character');
  const classes = Object.keys(CLASS_CONFIG);
  body.innerHTML = `
    <div class="grid grid-cols-2 gap-2">
      <label class="col-span-2">Name <input id="name" class="w-full border p-1" value="${character.identity.name}"></label>
      <label>Level <input id="level" type="number" min="1" max="20" class="w-full border p-1" value="${character.identity.level}"></label>
      <label>Race <input id="race" class="w-full border p-1" value="${character.identity.race}"></label>
      <label>Background <input id="background" class="w-full border p-1" value="${character.identity.background}"></label>
      <label>Alignment <input id="alignment" class="w-full border p-1" value="${character.identity.alignment}"></label>
      <label>Class
        <select id="class" class="w-full border p-1">
          ${classes.map(c => `<option ${character.identity.class===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </label>
    </div>
  `;

  body.querySelector('#name').addEventListener('input', e => { character.identity.name = e.target.value; saveCharacter(); });
  body.querySelector('#race').addEventListener('input', e => { character.identity.race = e.target.value; saveCharacter(); });
  body.querySelector('#background').addEventListener('input', e => { character.identity.background = e.target.value; saveCharacter(); });
  body.querySelector('#alignment').addEventListener('input', e => { character.identity.alignment = e.target.value; saveCharacter(); });
  body.querySelector('#level').addEventListener('change', e => {
    const lvl = clamp(parseInt(e.target.value)||1,1,20);
    applyChange(() => {
      character.identity.level = lvl;
      character.proficiencyBonus = proficiencyBonus(lvl);
    });
  });
  body.querySelector('#class').addEventListener('change', e => {
    applyChange(() => { character.identity.class = e.target.value; });
  });
}

// HP panel
function renderHP() {
  const body = panel('left', 'hp', 'Hit Points');
  const hp = character.combat.hp;
  const pct = hp.max ? hp.current / hp.max : 0;
  let barColor = 'bg-green-500';
  if (pct < 0.3) barColor = 'bg-red-500';
  else if (pct < 0.6) barColor = 'bg-amber-500';
  body.innerHTML = `
    <div class="flex items-center space-x-2 mb-2">
      <span>Current</span>
      <button type="button" class="chip-btn" data-delta="-5">-5</button>
      <button type="button" class="chip-btn" data-delta="-1">-1</button>
      <input id="currentHp" type="number" class="w-16 border p-1" value="${hp.current}">
      <button type="button" class="chip-btn" data-delta="1">+1</button>
      <button type="button" class="chip-btn" data-delta="5">+5</button>
    </div>
    <div>Max: <input id="maxHp" type="number" class="w-16 border p-1" value="${hp.max}"></div>
    <div>Temp: <input id="tempHp" type="number" class="w-16 border p-1" value="${hp.temp}"></div>
    <div class="mt-2">Hit Dice: <span id="hitDice">${character.combat.hitDice.remaining}/${character.combat.hitDice.total} ${character.combat.hitDice.die}</span>
      <button id="hdMinus" type="button" class="chip-btn ml-2" data-delta="-1">-</button>
      <button id="hdPlus" type="button" class="chip-btn" data-delta="1">+</button>
    </div>
    <div class="mt-3">
      <div class="h-2 bg-gray-200 rounded">
        <div id="hpBar" class="h-2 rounded ${barColor}" style="width:${pct*100}%"></div>
      </div>
      <div class="text-xs text-gray-600 mt-1">${hp.current}/${hp.max} (+${hp.temp} temp)</div>
    </div>
  `;

  const pulse = () => {
    const inp = body.querySelector('#currentHp');
    inp.classList.add('pulse-change');
    setTimeout(() => inp.classList.remove('pulse-change'), 400);
  };

  body.querySelectorAll('button[data-delta]').forEach(btn => {
    btn.addEventListener('click', e => {
      const delta = parseInt(e.target.dataset.delta);
      applyChange(() => {
        hp.current = clamp(hp.current + delta, 0, hp.max);
      }, `${delta>0?'+':''}${delta} HP`);
      pulse();
    });
  });
  body.querySelector('#currentHp').addEventListener('change', e => {
    const val = clamp(parseInt(e.target.value)||0,0,hp.max);
    applyChange(() => { hp.current = val; });
    pulse();
  });
  body.querySelector('#maxHp').addEventListener('change', e => {
    const val = parseInt(e.target.value)||1;
    applyChange(() => {
      hp.max = val;
      hp.current = clamp(hp.current,0,hp.max);
    });
  });
  body.querySelector('#tempHp').addEventListener('change', e => {
    const val = parseInt(e.target.value)||0;
    applyChange(() => { hp.temp = val; });
  });
  body.querySelector('#hdMinus').addEventListener('click', () => {
    const hd = character.combat.hitDice;
    applyChange(() => { hd.remaining = clamp(hd.remaining-1,0,hd.total); });
  });
  body.querySelector('#hdPlus').addEventListener('click', () => {
    const hd = character.combat.hitDice;
    applyChange(() => { hd.remaining = clamp(hd.remaining+1,0,hd.total); });
  });
}

function renderCombat() {
  const body = panel('left', 'combat', 'Combat');
  const c = character.combat;
  const passive = abilityMod(character.abilities.WIS) + 10 + (character.skills['Perception']?.prof?character.proficiencyBonus*(character.skills['Perception'].expertise?2:1):0);
  body.innerHTML = `
    <div class="grid grid-cols-2 gap-2">
      <label>AC <input id="ac" type="number" class="w-full border p-1" value="${c.ac}"></label>
      <label>Initiative <input id="init" type="number" class="w-full border p-1" value="${c.initiative}"></label>
      <label>Speed <input id="speed" type="number" class="w-full border p-1" value="${c.speed}"></label>
      <div>Passive Perception <span>${passive}</span></div>
    </div>
    <div class="mt-2 flex space-x-2">
      <button id="shortRest" type="button" class="chip-btn">Short Rest</button>
      <button id="longRest" type="button" class="chip-btn">Long Rest</button>
    </div>
  `;

  body.querySelector('#ac').addEventListener('change', e => { c.ac = parseInt(e.target.value)||0; saveCharacter(); });
  body.querySelector('#init').addEventListener('change', e => { c.initiative = parseInt(e.target.value)||0; saveCharacter(); });
  body.querySelector('#speed').addEventListener('change', e => { c.speed = parseInt(e.target.value)||0; saveCharacter(); });
  body.querySelector('#shortRest').addEventListener('click', shortRest);
  body.querySelector('#longRest').addEventListener('click', longRest);
}

// Abilities and saves
function renderAbilities() {
  const body = panel('middle', 'abilities', 'Abilities & Saves');
  const table = document.createElement('table');
  table.className = 'w-full text-center';
  table.innerHTML = `<tr><th>Ability</th><th>Score</th><th>Mod</th><th>Save</th></tr>`;
  Object.keys(character.abilities).forEach(ab => {
    const score = character.abilities[ab];
    const mod = abilityMod(score);
    const prof = character.saves[ab];
    const save = mod + (prof?character.proficiencyBonus:0);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="font-bold">${ab}</td>
      <td><input data-ab="${ab}" type="number" class="w-16 border p-1" value="${score}"></td>
      <td>${mod>=0?'+':''}${mod}</td>
      <td><label class="flex items-center justify-center"><input data-save="${ab}" type="checkbox" ${prof? 'checked':''}/> <span class="ml-1">${save>=0?'+':''}${save}</span></label></td>
    `;
    table.appendChild(row);
  });
  body.appendChild(table);

  body.querySelectorAll('input[data-ab]').forEach(inp => {
    inp.addEventListener('change', e => {
      const ab = e.target.dataset.ab;
      applyChange(() => { character.abilities[ab] = parseInt(e.target.value)||0; });
    });
  });
  body.querySelectorAll('input[data-save]').forEach(inp => {
    inp.addEventListener('change', e => {
      const ab = e.target.dataset.save;
      applyChange(() => { character.saves[ab] = e.target.checked; });
    });
  });
}

// Skills
function renderSkills() {
  const body = panel('middle', 'skills', 'Skills');
  body.innerHTML = `<input id="skillSearch" placeholder="Search" class="w-full border p-1 mb-2">
    <div id="skillList" class="space-y-1"></div>`;
  const list = body.querySelector('#skillList');
  const renderList = () => {
    list.innerHTML = '';
    const filter = body.querySelector('#skillSearch').value.toLowerCase();
    SKILLS.filter(s => s.name.toLowerCase().includes(filter)).forEach(skill => {
      if(!character.skills[skill.name]) character.skills[skill.name] = { prof:false, expertise:false };
      const data = character.skills[skill.name];
      const mod = abilityMod(character.abilities[skill.ability]);
      const total = mod + (data.prof?character.proficiencyBonus:0) + (data.expertise?character.proficiencyBonus:0);
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between';
      item.innerHTML = `
        <span>${skill.name} (${skill.ability}) ${total>=0?'+':''}${total}</span>
        <span>
          <label class="mr-2"><input type="checkbox" data-skill="${skill.name}" data-type="prof" ${data.prof?'checked':''}/> Prof</label>
          <label><input type="checkbox" data-skill="${skill.name}" data-type="exp" ${data.expertise?'checked':''}/> Exp</label>
        </span>`;
      list.appendChild(item);
    });
  };
  renderList();
  body.querySelector('#skillSearch').addEventListener('input', renderList);
  list.addEventListener('change', e => {
    const skill = e.target.dataset.skill;
    const type = e.target.dataset.type;
    applyChange(() => {
      if(type==='prof') character.skills[skill].prof = e.target.checked;
      if(type==='exp') character.skills[skill].expertise = e.target.checked;
    });
  });
}

// Class panels
function renderClassPanels() {
  const body = panel('right', 'classPanels', `${character.identity.class} Features`);
  const conf = CLASS_CONFIG[character.identity.class];
  conf.panels.forEach(p => {
    const container = document.createElement('div');
    container.className = 'mb-2';
    if(p.type === 'counter') {
      const obj = getByPath(character, p.key);
      const remaining = obj.max - (obj.used??0);
      container.innerHTML = `
        <div class="flex items-center justify-between">
          <span>${p.label}</span>
          <span>
            <button type="button" class="chip-btn" data-key="${p.key}" data-delta="-1">-</button>
            <span class="mx-2">${remaining}/${obj.max}</span>
            <button type="button" class="chip-btn" data-key="${p.key}" data-delta="1">+</button>
          </span>
        </div>
      `;
    } else if(p.type === 'toggle') {
      const val = getByPath(character, p.key);
      container.innerHTML = `
        <label class="flex items-center">
          <input type="checkbox" data-key="${p.key}" ${val? 'checked':''}/> <span class="ml-2">${p.label}</span>
        </label>
      `;
    } else if(p.type === 'pool') {
      const obj = getByPath(character, p.key);
      container.innerHTML = `
        <div>${p.label}: <input type="number" class="w-16 border p-1" data-key="${p.key}.remaining" value="${obj.remaining}"> / <input type="number" class="w-16 border p-1" data-key="${p.key}.max" value="${obj.max}"></div>
      `;
    } else if(p.type === 'static') {
      container.textContent = p.label;
    }
    body.appendChild(container);
  });

  body.querySelectorAll('button[data-key]').forEach(btn => {
    btn.addEventListener('click', e => {
      const key = e.target.dataset.key;
      const delta = parseInt(e.target.dataset.delta);
      const obj = getByPath(character, key);
      const prevUsed = obj.used || 0;
      const remaining = obj.max - prevUsed;
      const newRemaining = clamp(remaining + delta, 0, obj.max);
      applyChange(() => { obj.used = obj.max - newRemaining; });
    });
  });
  body.querySelectorAll('input[type=checkbox][data-key]').forEach(cb => {
    cb.addEventListener('change', e => {
      applyChange(() => { setByPath(character, e.target.dataset.key, e.target.checked); });
    });
  });
  body.querySelectorAll('input[type=number][data-key]').forEach(inp => {
    inp.addEventListener('change', e => {
      const val = parseInt(e.target.value)||0;
      applyChange(() => { setByPath(character, e.target.dataset.key, val); });
    });
  });
}

// Spell slots
function renderSpells() {
  const isCaster = CLASS_CONFIG[character.identity.class].caster || character.spells.casterType !== 'none';
  if(!isCaster) return;
  const body = panel('right', 'spells', 'Spell Slots');
  const slotLevels = Object.keys(character.spells.slots).sort((a,b)=>a-b);
  slotLevels.forEach(lvl => {
    const slot = character.spells.slots[lvl];
    const container = document.createElement('div');
    container.className = 'flex items-center justify-between mb-1';
    container.innerHTML = `
      <span>Level ${lvl}</span>
      <span>
        <button type="button" class="chip-btn" data-level="${lvl}" data-delta="-1">-</button>
        <span class="mx-2">${slot.max - slot.used}/${slot.max}</span>
        <button type="button" class="chip-btn" data-level="${lvl}" data-delta="1">+</button>
      </span>
    `;
    body.appendChild(container);
  });
  body.innerHTML += `<div class="mt-2 space-x-2"><button id="editSlots" type="button" class="chip-btn">Edit Slots</button><button id="resetSlots" type="button" class="chip-btn">Reset</button></div>`;

  body.querySelectorAll('button[data-level]').forEach(btn => {
    btn.addEventListener('click', e => {
      const lvl = e.target.dataset.level;
      const delta = parseInt(e.target.dataset.delta);
      const slot = character.spells.slots[lvl];
      const prevUsed = slot.used || 0;
      const remaining = slot.max - prevUsed;
      const newRemaining = clamp(remaining + delta, 0, slot.max);
      applyChange(() => { slot.used = slot.max - newRemaining; });
    });
  });
  const edit = body.querySelector('#editSlots');
  if(edit) edit.addEventListener('click', () => {
    const lvl = parseInt(prompt('Slot level (1-9)?'), 10);
    const max = parseInt(prompt('Max slots?'), 10);
    if(!lvl || !max) return;
    applyChange(() => {
      if(!character.spells.slots[lvl]) character.spells.slots[lvl] = { max: max, used: 0 };
      else character.spells.slots[lvl].max = max;
    });
  });
  const reset = body.querySelector('#resetSlots');
  if(reset) reset.addEventListener('click', () => {
    applyChange(() => {
      Object.values(character.spells.slots).forEach(s => s.used = 0);
    });
  });
}

// Notes & conditions
function renderNotes() {
  const body = panel('right', 'notes', 'Notes & Conditions');
  const conds = ["Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated","Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious"];
  body.innerHTML = `
    <div class="grid grid-cols-2 gap-1 mb-2">
      ${conds.map(c=>`<label><input type="checkbox" data-cond="${c}" ${character.combat.conditions.includes(c)?'checked':''}/> ${c}</label>`).join('')}
    </div>
    <textarea id="notes" class="w-full border p-1" rows="4" placeholder="Notes">${character.notes}</textarea>`;
  body.querySelector('#notes').addEventListener('input', e => { applyChange(() => { character.notes = e.target.value; }); });
  body.querySelectorAll('input[data-cond]').forEach(cb => {
    cb.addEventListener('change', e => {
      const cond = e.target.dataset.cond;
      applyChange(() => {
        if(e.target.checked) {
          if(!character.combat.conditions.includes(cond)) character.combat.conditions.push(cond);
        } else {
          character.combat.conditions = character.combat.conditions.filter(c=>c!==cond);
        }
      });
    });
  });
}

// Dice roller
function renderDice() {
  const body = panel('left', 'dicePanel', 'Dice Roller');
  body.innerHTML = `
    <div class="mb-2">
      <label><input type="checkbox" id="adv"> Advantage</label>
      <label class="ml-2"><input type="checkbox" id="dis"> Disadvantage</label>
    </div>
    <div class="space-x-1 mb-2">
      ${[4,6,8,10,12,20].map(d=>`<button type="button" class="chip-btn" data-die="${d}">d${d}</button>`).join('')}
    </div>
    <div id="diceLog" class="text-sm h-24 overflow-y-auto border p-1 bg-gray-50"></div>`;
  const logDiv = body.querySelector('#diceLog');
  logDiv.innerHTML = character.log.map(l=>`<div>${l}</div>`).join('');
  body.querySelectorAll('button[data-die]').forEach(btn => {
    btn.addEventListener('click', e => {
      const die = parseInt(e.target.dataset.die);
      let rolls = [rollDie(die)];
      if(body.querySelector('#adv').checked) rolls.push(rollDie(die));
      if(body.querySelector('#dis').checked) rolls.push(rollDie(die));
      const result = body.querySelector('#adv').checked ? Math.max(...rolls) : body.querySelector('#dis').checked ? Math.min(...rolls) : rolls[0];
      applyChange(() => {}, `Rolled d${die}: ${result}${rolls.length>1?` [${rolls.join(',')}]`:''}`);
    });
  });
}

function rollDie(sides) { return Math.floor(Math.random()*sides)+1; }

// Import/Export
function renderImportExport() {
  const body = panel('left', 'impex', 'Import / Export');
  body.innerHTML = `
    <button id="exportBtn" type="button" class="chip-btn">Export</button>
    <label class="chip-btn ml-2 cursor-pointer">Import<input id="importFile" type="file" class="hidden" accept="application/json"></label>`;
  body.querySelector('#exportBtn').addEventListener('click', () => {
    const data = JSON.stringify(character, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (character.identity.name||'character') + '.json';
    a.click();
  });
  body.querySelector('#importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try { character = JSON.parse(evt.target.result); saveCharacter(); render(); }
      catch(err) { alert('Invalid file'); }
    };
    reader.readAsText(file);
  });
}

function renderLog() {
  const body = panel('right', 'actionLog', 'Action Log');
  body.innerHTML = `<div class="h-32 overflow-y-auto">${character.log.map(l=>`<div>${l}</div>`).join('')}</div>`;
}

// Rest logic
async function shortRest() {
  if(!(await confirmModal('Short Rest','Recover short-rest features?'))) return;
  applyChange(() => {
    Object.values(CLASS_CONFIG).forEach(conf => {
      conf.panels.forEach(p => {
        if(p.per === 'Short Rest') {
          const obj = getByPath(character, p.key);
          if(p.type === 'counter') obj.used = 0;
          if(p.type === 'toggle') setByPath(character, p.key, true);
          if(p.type === 'pool') obj.remaining = obj.max;
        }
      });
    });
  }, 'Took a short rest');
  toast('Short rest complete');
}

async function longRest() {
  if(!(await confirmModal('Long Rest','Recover all features and hit points?'))) return;
  applyChange(() => {
    Object.values(CLASS_CONFIG).forEach(conf => {
      conf.panels.forEach(p => {
        if(p.per === 'Long Rest' || p.per === 'Short Rest') {
          const obj = getByPath(character, p.key);
          if(p.type === 'counter') obj.used = 0;
          if(p.type === 'toggle') setByPath(character, p.key, true);
          if(p.type === 'pool') obj.remaining = obj.max;
        }
      });
    });
    character.combat.hp.current = character.combat.hp.max;
    character.combat.hp.temp = 0;
    const hd = character.combat.hitDice;
    const recover = Math.floor((hd.total - hd.remaining)/2);
    hd.remaining = clamp(hd.remaining + recover, 0, hd.total);
  }, 'Took a long rest');
  toast('Long rest complete');
}

document.addEventListener('keydown', e => {
  if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const key = e.key.toLowerCase();
  if(key === 'h') {
    const hpInput = document.getElementById('currentHp');
    if(hpInput) hpInput.focus();
  } else if(key === 'r') {
    shortRest();
  } else if(key === 'l') {
    longRest();
  } else if(key === 'd') {
    const dice = document.getElementById('dicePanel');
    if(dice) dice.scrollIntoView({behavior:'smooth'});
  }
});

// Initial render
render();
