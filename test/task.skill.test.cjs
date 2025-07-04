const { expect } = require('chai');

describe('task skill progression', () => {
  it('uses exponential table for levels', async () => {
    const { getTaskSkillProgress } = await import('../utils/taskSkills.js');
    let prog = getTaskSkillProgress(0);
    expect(prog.level).to.equal(0);
    prog = getTaskSkillProgress(50);
    expect(prog.level).to.equal(1);
    prog = getTaskSkillProgress(110);
    expect(prog.level).to.equal(2);
  });
});
