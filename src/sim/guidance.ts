/**
 * Pitch Program & Guidance Law for PSLV-XL
 * Defines pitch angle ψ(t) w.r.t. local horizontal:
 *  90° = vertical ascent (launch pad liftoff)
 *   0° = horizontal insertion (orbital circularization)
 */

import { PitchScheduleNode, ChallengeModeModifiers } from './types';

export class GuidanceProgram {
  private nodes: PitchScheduleNode[];
  private pitchKickDelta_deg: number;

  constructor(nodes: PitchScheduleNode[], modifiers?: ChallengeModeModifiers) {
    // Sort nodes chronologically
    this.nodes = [...nodes].sort((a, b) => a.time_s - b.time_s);
    this.pitchKickDelta_deg = modifiers?.enabled ? modifiers.pitchKickDeg : 0;
  }

  /**
   * Evaluates commanded pitch angle (deg from local horizontal) at time t (seconds)
   * With closed-loop Auto-Guidance flight path nulling for orbital circularization (t >= 500s)
   */
  public getPitchAngle(time_s: number, vr_ms: number = 0, vth_ms: number = 1, altitude_m: number = 534000): number {
    if (this.nodes.length === 0) return 90.0;

    let basePitch = 90.0;

    // Before first node: hold initial pitch
    if (time_s <= this.nodes[0].time_s) {
      basePitch = this.nodes[0].pitchDeg;
    } else if (time_s >= this.nodes[this.nodes.length - 1].time_s) {
      basePitch = this.nodes[this.nodes.length - 1].pitchDeg;
    } else {
      // Find bounding nodes for smooth interpolation
      let idx = 0;
      for (let i = 0; i < this.nodes.length - 1; i++) {
        if (time_s >= this.nodes[i].time_s && time_s <= this.nodes[i + 1].time_s) {
          idx = i;
          break;
        }
      }

      const n0 = this.nodes[idx];
      const n1 = this.nodes[idx + 1];

      const span = n1.time_s - n0.time_s;
      const alpha = (time_s - n0.time_s) / (span > 0 ? span : 1);

      // Smooth Hermite / S-curve interpolation: 3*alpha^2 - 2*alpha^3
      const smoothAlpha = alpha * alpha * (3.0 - 2.0 * alpha);
      basePitch = n0.pitchDeg + (n1.pitchDeg - n0.pitchDeg) * smoothAlpha;
    }

    // Apply pitch kick delta smoothly after initial vertical climb (t > 12s)
    if (time_s > 12.0) {
      const kickEffect = Math.min(1.0, (time_s - 12.0) / 20.0);
      basePitch -= this.pitchKickDelta_deg * kickEffect;
    }

    // Auto-Guidance circularization control (t >= 750s, PS4 terminal insertion phase):
    // Smoothly nulls vertical rate and circularizes at target altitude (534 km)
    if (time_s >= 750.0 && vth_ms > 1000.0) {
      const targetAlt_m = 534000.0;
      const altError_m = targetAlt_m - altitude_m;
      // Desired vertical rate (m/s) as it approaches 534 km
      const desiredVr_ms = Math.max(-10.0, Math.min(15.0, altError_m / 25.0));
      const vrError_ms = desiredVr_ms - vr_ms;
      
      const trim_deg = 0.25 * vrError_ms;
      basePitch = Math.max(-5.0, Math.min(15.0, basePitch + trim_deg));
    }

    return Math.max(-10.0, Math.min(90.0, basePitch));
  }
}
