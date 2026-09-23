import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeReportNF } from './reportNF.js';

test('computeReportNF', async (t) => {
  await t.test('un solo periodo carga NF = ese promedio / 4', () => {
    assert.equal(computeReportNF([7, null, null, null]), 2);
    assert.equal(computeReportNF([5.5, null, null, null]), 1);
  });

  await t.test('dos o tres periodos dividen igual entre 4', () => {
    assert.equal(computeReportNF([7, 8, null, null]), 4);
    assert.equal(computeReportNF([7, 8, 9, null]), 6);
  });

  await t.test('los 4 periodos cargados generan NF redondeado', () => {
    assert.equal(computeReportNF([7, 7, 7, 7]), 7);
    assert.equal(computeReportNF([7, 8, 6, 7]), 7);
    assert.equal(computeReportNF([5, 5, 5, 5]), 5);
  });

  await t.test('sin periodos cargados no genera NF', () => {
    assert.equal(computeReportNF([]), '-');
    assert.equal(computeReportNF([null, null, null, null]), '-');
    assert.equal(computeReportNF([undefined, undefined, undefined, undefined]), '-');
  });
});