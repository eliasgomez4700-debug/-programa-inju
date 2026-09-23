import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGradeAverage } from './gradeAverage.js';

test('computeGradeAverage', async (t) => {
  await t.test('promedio regular >= 6 devuelve el promedio redondeado a 2', () => {
    assert.equal(computeGradeAverage(7, 7, 7, 0, 0), 7);
    assert.equal(computeGradeAverage(6, 6, 6, 0, 0), 6);
    assert.equal(computeGradeAverage(6.5, 6.5, 6.5, 0, 0), 6.5);
    assert.equal(computeGradeAverage(6.1, 6.1, 6.1, 0, 0), 6.1);
  });

  await t.test('promedio regular < 6 sin recuperación ni refuerzo devuelve el regular', () => {
    assert.equal(computeGradeAverage(5, 5, 5, 0, 0), 5);
    assert.equal(computeGradeAverage(5.5, 5.5, 5.5, 0, 0), 5.5);
    assert.equal(computeGradeAverage(0, 0, 0, 0, 0), 0);
  });

  await t.test('promedio regular < 6 con recuperación aprobatoria devuelve 6', () => {
    assert.equal(computeGradeAverage(5, 5, 5, 6, 6), 6);
    assert.equal(computeGradeAverage(5, 5, 5, 7, 5), 6);
  });

  await t.test('promedio regular < 6 con recuperación reprobatoria devuelve la nota de recuperación', () => {
    assert.equal(computeGradeAverage(5, 5, 5, 5, 5), 5);
    assert.equal(computeGradeAverage(5, 5, 5, 6, 4), 5);
  });

  await t.test('la nota de recuperación es el promedio de rec y ref juntas', () => {
    assert.equal(computeGradeAverage(5, 5, 5, 6, 0), 3);
    assert.equal(computeGradeAverage(5, 5, 5, 0, 6), 3);
    assert.equal(computeGradeAverage(5, 5, 5, 4, 0), 2);
  });

  await t.test('promedio regular justo bajo 6 con recuperación exacta a 6 devuelve 6', () => {
    assert.equal(computeGradeAverage(5.9, 5.9, 5.9, 6, 6), 6);
  });
});