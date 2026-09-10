const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/horse-racing/index.html', 'utf8');
class Element {
    constructor() { this.value = ''; this.style = {}; this.children = []; this.listeners = {}; this.attributes = {}; this.classList = {add(){},remove(){}}; }
    addEventListener(event, fn) { this.listeners[event] = fn; }
    setAttribute(key, value) { this.attributes[key] = value; }
    appendChild(child) { this.children.push(child); }
    scrollIntoView() {}
    getBoundingClientRect() { return {width:800}; }
    replaceChildren() { this.children = []; }
}
const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], new Element()]));
nodes.track.width = 480; nodes.track.height = 252;
const context2d = new Proxy({}, {get: (_, key) => key === 'measureText' ? text => ({width:text.length*8}) : key === 'createLinearGradient' ? () => ({addColorStop(){}}) : () => {}, set: () => true});
nodes.track.getContext = () => context2d;
const wallet = new Element();
const storage = new Map();
const sandbox = {console, performance, setTimeout:()=>1, clearTimeout(){}, setInterval:()=>1, clearInterval(){}, requestAnimationFrame:()=>1, cancelAnimationFrame(){}, localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}, document:{getElementById:id=>nodes[id]||null, querySelector:()=>wallet,querySelectorAll:()=>[],createElement:()=>new Element()}};
let code = fs.readFileSync('tools/horse-racing/horse-racing.js','utf8');
code = code.replace(/\}\)\(\);\s*$/, `globalThis.game = {setMode, beginRace, startLoop, finishRace, backToLobby, monteCarloWinner, loadHistory, state:()=>({mode,horses,balance,history,phase}), win:()=>{selected=0; $betAmount.value='100'; beginRace(true); startLoop(); horses.forEach((h,i)=>{h.finishT=i+1;}); finishRace();}};})();`);
vm.createContext(sandbox); vm.runInContext(code,sandbox);
const game = sandbox.game;
assert.equal(game.state().mode,'draw');
assert.equal(nodes['bet-controls'].hidden,true);
assert.equal(nodes.entries.children.length,6);
assert.ok(game.state().horses.every(h=>h.strength===1&&h.stamina===1));
const nameInput=nodes.entries.children[0].children[1].children[1];
nameInput.value='<img src=x onerror=alert(1)>';nameInput.listeners.input();
assert.equal(game.state().horses[0].name,nameInput.value);
nodes.entries.children[0].children[2].listeners.click();
assert.ok(nodes['race-selection'].textContent.includes('선택: 1번'));
game.beginRace(false);assert.equal(game.state().balance,1000);
game.startLoop();game.state().horses.forEach((h,i)=>{h.finishT=i+1;});game.finishRace();
assert.equal(game.state().history[0].mode,'draw');
assert.ok(nodes['race-selection'].textContent.includes('당첨: 1번'));
assert.ok(nodes['overlay-box'].innerHTML.includes('&lt;img'));
game.backToLobby();assert.equal(game.state().horses[0].name,nameInput.value);
game.setMode('bet');assert.equal(nodes['bet-controls'].hidden,false);
const originalOdds = game.state().horses.map(h=>h.odds);
assert.ok(Math.abs(game.state().horses.reduce((sum,h)=>sum+h.winProb,0)-1)<1e-10);
assert.ok(nodes.entries.children[0].children[3].children[0].textContent.startsWith('추정 '));
assert.equal(nodes.entries.children[0].children[1].children[1].hidden,true);
nodes['edit-names'].listeners.click();
assert.equal(nodes.entries.children[0].children[1].children[1].hidden,false);
nodes['edit-names'].listeners.click();
assert.deepEqual(game.state().horses.map(h=>h.odds),originalOdds);
const odds=game.state().horses[0].odds;game.win();
assert.ok(nodes['race-selection'].textContent.includes('100 C'));
assert.equal(game.state().balance,1000-100+Math.floor(100*odds));
assert.equal(game.state().history[0].money,Math.floor(100*odds)-100);
for(let i=0;i<32;i++){game.backToLobby();game.setMode('draw');game.beginRace(false);game.startLoop();game.state().horses.forEach((h,j)=>{h.finishT=j+1;});game.finishRace();}
assert.equal(game.state().history.length,30);assert.equal(game.loadHistory().length,30);
storage.set('toolify-horse-racing-history-v1',JSON.stringify([{winnerName:'기존',outcome:'win',money:450,bet:{amount:100,odds:4.5}}]));assert.equal(game.loadHistory()[0].money,350);
game.backToLobby();
for (const count of [2,10,6]) {
    nodes['participant-count'].listeners.change({target:{value:String(count)}});
    assert.equal(game.state().horses.length,count);
    assert.equal(nodes.entries.children.length,count);
    assert.equal(nodes.track.height,100+66*count+12);
    assert.ok(game.monteCarloWinner() < count);
}
nodes['participant-count'].listeners.change({target:{value:'1'}});game.setMode('bet');
assert.equal(game.state().horses.length,2);
assert.ok(!html.includes('<option value="1">'));
assert.ok(game.state().horses.every(h=>Number.isFinite(h.odds)));
console.log('PASS: participant counts 2/6/10 and minimum enforcement; mode switching, equal draw abilities, custom name escaping and retention, draw without coins, payout/net, 30-race retention, legacy history migration');
