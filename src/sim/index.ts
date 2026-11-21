/**
 * BharatLaunch 3D Physics & Simulation Module
 * Strictly decoupled from React / Three.js
 */

export * from './constants';
export * from './types';
export * from './atmosphere';
export * from './gravity';
export * from './propulsion';
export * from './guidance';
export * from './rk4';
export * from './engine';

import pslvC52Mission from './missions/pslv_c52_eos04.json';
import pslvC25Mission from './missions/pslv_c25_mom.json';
import pslvC57Mission from './missions/pslv_c57_aditya_l1.json';
import { MissionConfig } from './types';

export const PRESET_MISSIONS: Record<string, MissionConfig> = {
  'pslv-c52-eos04': pslvC52Mission as unknown as MissionConfig,
  'pslv-c25-mom': pslvC25Mission as unknown as MissionConfig,
  'pslv-c57-aditya-l1': pslvC57Mission as unknown as MissionConfig,
};

export const DEFAULT_MISSION_ID = 'pslv-c52-eos04';
