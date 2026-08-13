import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDemoDataset } from '../src/scripts/demo-data.js';
import { buildDemoHierarchyPlan } from '../src/scripts/persist-demo-data.js';

void describe('deterministic demonstration dataset', () => {
  void it('creates stable, bounded semester-scale fictional records', () => {
    const first = buildDemoDataset(20260809);
    const second = buildDemoDataset(20260809);
    assert.deepEqual(first, second);
    assert.equal(first.students.length, 240);
    assert.equal(first.lecturers.length, 18);
    assert.ok(first.students.length <= 1000);
    assert.ok(first.lecturers.length <= 100);
    assert.ok(new Set(first.attendance.map((row) => row.pattern)).size >= 5);
    assert.ok(first.sessions.length >= 16 * first.courses.length);
    assert.ok(first.attendance.length > 10_000);
  });

  void it('plans parented faculties and programme-specific levels', () => {
    const hierarchy = buildDemoHierarchyPlan(buildDemoDataset(20260809));

    assert.ok(hierarchy.faculties.every((item) => item.parentCode === 'MAIN'));
    assert.ok(hierarchy.programmes.every((item) => item.parentCode.startsWith('FAC-')));
    assert.ok(hierarchy.levels.every((item) => item.parentCode.startsWith('PRG-')));
    assert.equal(new Set(hierarchy.levels.map((item) => item.code)).size, hierarchy.levels.length);
    assert.ok(hierarchy.levels.every((item) => item.code.length <= 32));
    assert.equal(hierarchy.levels.length, hierarchy.programmes.length * 4);
  });
});
