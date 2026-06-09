/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Position} from '@xyflow/react';

import {getPortAnchors} from '~features/usecase-visualizer/lib/port-anchors';
import {offsetForIndex} from '~features/usecase-visualizer/lib/port-geometry';
import type {Port} from '~features/usecase-visualizer/model/visualizer.types';

jest.mock('~shared/lib/logger');

function makePort(
  id: string,
  portIoType: 'input' | 'output' | 'control',
): Port {
  return {id, portIoType};
}

describe('getPortAnchors', () => {
  describe('rect — regression: 2 input + 2 output + 1 control', () => {
    const W = 160;
    const H = 100;
    const ports: Port[] = [
      makePort('i1', 'input'),
      makePort('i2', 'input'),
      makePort('o1', 'output'),
      makePort('o2', 'output'),
      makePort('c1', 'control'),
    ];
    const anchors = getPortAnchors('rect', ports, W, H);

    it('input anchor y values match offsetForIndex', () => {
      const inputs = anchors.filter(
        (a) => a.handleKind === 'target' && a.position === Position.Left,
      );
      expect(inputs).toHaveLength(2);
      expect(inputs[0].y).toBe(offsetForIndex(H, 2, 0));
      expect(inputs[1].y).toBe(offsetForIndex(H, 2, 1));
    });

    it('output anchor y values match offsetForIndex', () => {
      const outputs = anchors.filter(
        (a) => a.handleKind === 'source' && a.position === Position.Right,
      );
      expect(outputs).toHaveLength(2);
      expect(outputs[0].y).toBe(offsetForIndex(H, 2, 0));
      expect(outputs[1].y).toBe(offsetForIndex(H, 2, 1));
    });

    it('control port produces 2 anchors (source + target) with same x', () => {
      const controls = anchors.filter((a) => a.position === Position.Top);
      expect(controls).toHaveLength(2);
      const expectedX = offsetForIndex(W, 1, 0);
      expect(controls[0].x).toBe(expectedX);
      expect(controls[1].x).toBe(expectedX);
      const kinds = controls.map((a) => a.handleKind).sort();
      expect(kinds).toEqual(['source', 'target']);
    });
  });

  describe('rect — single input, single output', () => {
    const W = 160;
    const H = 100;
    const ports: Port[] = [makePort('i1', 'input'), makePort('o1', 'output')];
    const anchors = getPortAnchors('rect', ports, W, H);

    it('input anchor: position Left, handleKind target', () => {
      const input = anchors.find((a) => a.port.id === 'i1');
      expect(input?.position).toBe(Position.Left);
      expect(input?.handleKind).toBe('target');
      expect(input?.y).toBe(offsetForIndex(H, 1, 0));
    });

    it('output anchor: position Right, handleKind source', () => {
      const output = anchors.find((a) => a.port.id === 'o1');
      expect(output?.position).toBe(Position.Right);
      expect(output?.handleKind).toBe('source');
      expect(output?.y).toBe(offsetForIndex(H, 1, 0));
    });
  });

  describe('circle — 1 input, 1 output, 80×80', () => {
    const W = 80;
    const H = 80;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2;
    const ports: Port[] = [makePort('i1', 'input'), makePort('o1', 'output')];
    const anchors = getPortAnchors('circle', ports, W, H);

    it('input anchor: position Left, handleKind target', () => {
      const input = anchors.find((a) => a.port.id === 'i1');
      expect(input?.position).toBe(Position.Left);
      expect(input?.handleKind).toBe('target');
    });

    it('output anchor: position Right, handleKind source', () => {
      const output = anchors.find((a) => a.port.id === 'o1');
      expect(output?.position).toBe(Position.Right);
      expect(output?.handleKind).toBe('source');
    });

    it('input anchor x,y lie on the circle outline', () => {
      const input = anchors.find((a) => a.port.id === 'i1')!;
      // Single input at deg = 150 + 60/(1+1)*1 = 180°
      const deg = 180;
      const rad = (deg * Math.PI) / 180;
      expect(input.x).toBeCloseTo(cx + r * Math.cos(rad), 1);
      expect(input.y).toBeCloseTo(cy + r * Math.sin(rad), 1);
    });

    it('output anchor x,y lie on the circle outline', () => {
      const output = anchors.find((a) => a.port.id === 'o1')!;
      // Single output at deg = -30 + 60/(1+1)*1 = 0°
      const deg = 0;
      const rad = (deg * Math.PI) / 180;
      expect(output.x).toBeCloseTo(cx + r * Math.cos(rad), 1);
      expect(output.y).toBeCloseTo(cy + r * Math.sin(rad), 1);
    });
  });

  describe('circle — 1 control port, 80×80', () => {
    const W = 80;
    const H = 80;
    const ports: Port[] = [makePort('c1', 'control')];
    const anchors = getPortAnchors('circle', ports, W, H);
    const controls = anchors.filter((a) => a.position === Position.Top);

    it('produces 2 Position.Top anchors (source + target)', () => {
      expect(controls).toHaveLength(2);
      const kinds = controls.map((a) => a.handleKind).sort();
      expect(kinds).toEqual(['source', 'target']);
    });

    it('both control anchors have x and y defined (not just y)', () => {
      for (const a of controls) {
        expect(a.x).toBeDefined();
        expect(a.y).toBeDefined();
      }
    });
  });

  describe('trapezoid-source — 1 output port', () => {
    const W = 120;
    const H = 80;
    const ports: Port[] = [makePort('o1', 'output')];
    const anchors = getPortAnchors('trapezoid-source', ports, W, H);

    it('anchor position is Right, handleKind source', () => {
      expect(anchors).toHaveLength(1);
      expect(anchors[0].position).toBe(Position.Right);
      expect(anchors[0].handleKind).toBe('source');
    });

    it('single output sits at the right tip: x = width, y = height/2', () => {
      expect(anchors[0].x).toBe(W);
      expect(anchors[0].y).toBe(H / 2);
    });
  });

  describe('trapezoid-source — 2 output ports', () => {
    const H = 100;
    const ports: Port[] = [makePort('o1', 'output'), makePort('o2', 'output')];
    const anchors = getPortAnchors('trapezoid-source', ports, 120, H);
    const outputs = anchors.filter(
      (a) => a.handleKind === 'source' && a.position === Position.Right,
    );

    it('both outputs present', () => {
      expect(outputs).toHaveLength(2);
    });

    it('multiple outputs fall back to rect: evenly spaced via offsetForIndex', () => {
      // offsetForIndex: step = (H - 2*12) / (2+1) = 76/3; y[i] = 12 + step*(i+1)
      const step = (H - 24) / 3;
      expect(outputs[0].y).toBeCloseTo(12 + step, 5);
      expect(outputs[1].y).toBeCloseTo(12 + step * 2, 5);
    });
  });

  describe('trapezoid-sink — 1 input port', () => {
    const H = 80;
    const ports: Port[] = [makePort('i1', 'input')];
    const anchors = getPortAnchors('trapezoid-sink', ports, 120, H);

    it('anchor position is Left, handleKind target', () => {
      expect(anchors).toHaveLength(1);
      expect(anchors[0].position).toBe(Position.Left);
      expect(anchors[0].handleKind).toBe('target');
    });

    it('single input sits at the left tip: x = 0, y = height/2', () => {
      expect(anchors[0].x).toBe(0);
      expect(anchors[0].y).toBe(H / 2);
    });
  });

  describe('triangle — 1 output port, 100×80', () => {
    const W = 100;
    const H = 80;
    const ports: Port[] = [makePort('o1', 'output')];
    const anchors = getPortAnchors('triangle', ports, W, H);

    it('single anchor, position Right, y = height/2', () => {
      expect(anchors).toHaveLength(1);
      expect(anchors[0].position).toBe(Position.Right);
      expect(anchors[0].y).toBe(H / 2);
    });

    it('x = width (the apex)', () => {
      expect(anchors[0].x).toBe(W);
    });
  });

  describe('triangle — 1 input port', () => {
    const H = 80;
    const ports: Port[] = [makePort('i1', 'input')];
    const anchors = getPortAnchors('triangle', ports, 100, H);

    it('single anchor, position Left, y = height/2, x = 0', () => {
      expect(anchors).toHaveLength(1);
      expect(anchors[0].position).toBe(Position.Left);
      expect(anchors[0].y).toBe(H / 2);
      expect(anchors[0].x).toBe(0);
    });
  });

  describe('undefined shape — behaves same as rect', () => {
    const W = 160;
    const H = 100;
    const ports: Port[] = [makePort('i1', 'input'), makePort('o1', 'output')];

    it('produces same result as explicit rect', () => {
      const rectAnchors = getPortAnchors('rect', ports, W, H);
      const undefinedAnchors = getPortAnchors(undefined, ports, W, H);
      expect(undefinedAnchors).toEqual(rectAnchors);
    });
  });
});
