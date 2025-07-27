/* global describe, it, before, beforeEach */
import { expect } from 'chai';

function setupDom() {
  const map = {
    childNodes: [],
    appendChild(el) { this.childNodes.push(el); },
    getBoundingClientRect() { return { width: 100, height: 100, left: 0, top: 0 }; }
  };
  const orb = { getBoundingClientRect() { return { width: 10, height: 10, left: 50, top: 50 }; } };
  globalThis.document = {
    getElementById: id => (id === 'colonyMap' ? map : null),
    querySelector: sel => (sel === '#sectOrbs .sect-orb.water' ? orb : null),
    createElement: () => ({ appendChild() {}, style: {}, className: '', remove() {} })
  };
  globalThis.window = {};
}

describe('blob raids', () => {
  let spawnBlob;
  let clearBlobs;
  let blobs;
  before(async () => {
    setupDom();
    const module = await import(`../game/blobRaids.js?test=${Date.now()}`);
    ({ spawnBlob, clearBlobs, blobs } = module);
  });

  beforeEach(() => {
    clearBlobs();
  });

  it('spawns blobs with a life bar', () => {
    const success = spawnBlob();
    expect(success).to.be.true;
    expect(blobs[0].lifeFill).to.exist;
    expect(blobs[0].lifeFill.style.width).to.equal('100%');
  });
});
