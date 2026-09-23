import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeModuleGrade, computeModuleLevel, computeModulePhaseAverage } from './moduleGradeAverage.js';

test('computeModulePhaseAverage', async (t) => {
  await t.test('promedia las tres notas', () => {
    assert.equal(computeModulePhaseAverage(6, 7, 8), 7);
    assert.equal(computeModulePhaseAverage(0, 0, 0), 0);
  });

  await t.test('trunca valores ausentes a 0', () => {
    assert.equal(computeModulePhaseAverage(undefined, undefined, 9), 3);
    assert.equal(computeModulePhaseAverage('', '', 6), 2);
  });
});

test('computeModuleLevel', async (t) => {
  await t.test('asigna el nivel según rangos', () => {
    assert.equal(computeModuleLevel(9.5), 5);
    assert.equal(computeModuleLevel(9), 5);
    assert.equal(computeModuleLevel(8), 4);
    assert.equal(computeModuleLevel(7), 4);
    assert.equal(computeModuleLevel(6), 3);
    assert.equal(computeModuleLevel(5), 3);
    assert.equal(computeModuleLevel(4), 2);
    assert.equal(computeModuleLevel(3), 2);
    assert.equal(computeModuleLevel(2.5), 1);
  });
});

test('computeModuleGrade', async (t) => {
  await t.test('calcula promedio ponderado 25/50/25', () => {
    const r = computeModuleGrade({
      preparacion_nota1: 10, preparacion_nota2: 10, preparacion_nota3: 10,
      ejecucion_nota1: 10, ejecucion_nota2: 10, ejecucion_nota3: 10,
      evaluacion_nota1: 10, evaluacion_nota2: 10, evaluacion_nota3: 10,
    });
    assert.equal(r.promedio, 10);
    assert.equal(r.nivel_logro, 5);
  });

  await t.test('ponderación 25/50/25 con valores distintos', () => {
    const r = computeModuleGrade({
      preparacion_nota1: 6, preparacion_nota2: 6, preparacion_nota3: 6,
      ejecucion_nota1: 8, ejecucion_nota2: 8, ejecucion_nota3: 8,
      evaluacion_nota1: 4, evaluacion_nota2: 4, evaluacion_nota3: 4,
    });
    assert.equal(r.promedio, 6.5);
    assert.equal(r.nivel_logro, 3);
  });

  await t.test('todos ceros da promedio 0 y nivel 1', () => {
    const r = computeModuleGrade({});
    assert.equal(r.promedio, 0);
    assert.equal(r.nivel_logro, 1);
  });
});