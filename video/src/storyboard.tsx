import React from 'react';
import {Decision} from './scenes/Decision';
import {Hook} from './scenes/Hook';
import {Outro} from './scenes/Outro';
import {Problem} from './scenes/Problem';
import {Proof} from './scenes/Proof';
import {Workflow} from './scenes/Workflow';

export type SceneDef = {
  id: string;
  start: number;
  end: number;
  label: string;
  component: React.FC;
  chapter?: boolean;
  hue?: number;
  push?: number;
};

export const SCENES: SceneDef[] = [
  {id: 'hook', start: 0, end: 7, label: 'Intro', component: Hook, hue: 0.15, push: 0.02},
  {id: 'problem', start: 7, end: 18, label: 'The problem', component: Problem, chapter: true, hue: 0.35},
  {id: 'workflow', start: 18, end: 36, label: 'How it works', component: Workflow, chapter: true, hue: 0.72},
  {id: 'decision', start: 36, end: 50, label: 'The gate', component: Decision, chapter: true, hue: 0.42},
  {id: 'proof', start: 50, end: 61, label: 'Measured', component: Proof, chapter: true, hue: 0.58},
  {id: 'outro', start: 61, end: 68, label: 'Outro', component: Outro, hue: 0.12, push: 0.02},
];

export const TOTAL_SECONDS = SCENES[SCENES.length - 1].end;
