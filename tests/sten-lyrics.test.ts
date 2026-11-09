import { describe, expect, it } from 'vitest';
import floorPlan from '../src/lib/floor-plan-review-timing.json';
import grownFolk from '../src/lib/grown-folk-business-timing.json';
import ourPeople from '../src/lib/our-people-in-the-trees-timing.json';

describe.each([
  { name: 'Floor-Plan Review', cues: floorPlan, duration: 279.92, minCues: 90 },
  { name: 'Grown Folk Business', cues: grownFolk, duration: 307.224, minCues: 90 },
  { name: 'Our People in the Trees', cues: ourPeople, duration: 261.144, minCues: 70 }
])('$name lyric timeline', ({ cues, duration, minCues }) => {
  it('has readable, ordered cues within the recording, without overlaps', () => {
    expect(cues.length).toBeGreaterThan(minCues);
    for (const [i, cue] of cues.entries()) {
      expect(cue.text.trim().length).toBeGreaterThan(0);
      expect(cue.section.trim().length).toBeGreaterThan(0);
      expect(cue.start).toBeGreaterThanOrEqual(0);
      expect(cue.end).toBeGreaterThan(cue.start);
      expect(cue.end).toBeLessThanOrEqual(duration);
      if (i) expect(cue.start).toBeGreaterThanOrEqual(cues[i - 1].end);
    }
  });
});
