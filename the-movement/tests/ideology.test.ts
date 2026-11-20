import { describe, expect, it } from 'vitest';
import { createMovement, defaultFounderTitle, deriveNames, generateProclamation, interpretDoctrine, moderate, multiWordSingular } from '../src/engine/ideology';
import { springismInput } from './fixtures';

describe('ideology creation', () => {
  it('derives names from the ideology', () => {
    expect(deriveNames('Hat')).toMatchObject({ ideologyName: 'Hatism', singularFollower: 'Hatist', pluralFollowers: 'Hatists', adjective: 'Hatist' });
    expect(deriveNames('Tuesdayism').ideologyName).toBe('Tuesdayism');
    expect(deriveNames('  kazoo  ').pluralFollowers).toBe('Kazooists');
  });

  it('respects follower-name overrides and custom terminology', () => {
    const mv = createMovement({ ...springismInput(), pluralFollowers: 'Bouncers', singularFollower: 'Bouncer', adjective: 'Bouncy', meetingName: 'Jam Sessions', outpostName: 'Shrines to Common Sense' });
    expect(mv.pluralFollowers).toBe('Bouncers');
    expect(mv.singularFollower).toBe('Bouncer');
    expect(mv.adjective).toBe('Bouncy');
    expect(mv.meetingSingular).toBe('Jam Session');
    expect(mv.outpostSingular).toBe('Shrine to Common Sense');
    expect(multiWordSingular('Power Circles')).toBe('Power Circle');
  });

  it('generates the founder title', () => {
    expect(defaultFounderTitle('Jeff')).toBe('Master J.');
    expect(defaultFounderTitle('Jeff', 'Grand Master')).toBe('Grand Master J.');
    expect(createMovement(springismInput()).founderTitle).toBe('Master J.');
  });

  it('stores banner colors and all doctrines with attributes in range', () => {
    const mv = createMovement(springismInput());
    expect(mv.banner.primary).toBe('#6b3fa0');
    expect(mv.doctrines).toHaveLength(6);
    for (const d of mv.doctrines) {
      for (const v of Object.values(d.attributes)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(d.originalText).toBe(d.currentText);
      expect(d.derivation.length).toBeGreaterThan(0);
    }
  });

  it('recognizes motifs so founding choices drive later content', () => {
    expect(interpretDoctrine('Wear oversized hats.', 'clothing').motif.key).toBe('hat');
    expect(interpretDoctrine('Wear springs on shoes.', 'clothing').motif.heresy).toBe('trampolines');
    expect(interpretDoctrine('Practice competitive napping.', 'hobby').motif.key).toBe('nap');
    expect(interpretDoctrine('Yacht rock.', 'music').motif.key).toBe('yachtrock');
    expect(interpretDoctrine('People should spend more time enjoying the journey than the destination.', 'principle').motif.key).toBe('walk');
  });

  it('builds a generic motif for unknown custom doctrines from their own words', () => {
    const d = interpretDoctrine('Everyone must own a ceremonial gazebo.', 'principle');
    expect(d.motif.key).toBe('generic:gazebo');
    expect(d.motif.plural).toBe('gazebos');
    expect(d.motif.committee).toContain('Gazebo');
  });

  it('derives attributes transparently from wording', () => {
    const strict = interpretDoctrine('Never use scented soap, always bathe precisely twice per day.', 'hygiene');
    const relaxed = interpretDoctrine('Enjoy a bath.', 'hygiene');
    expect(strict.attributes.controversy).toBeGreaterThan(relaxed.attributes.controversy);
    expect(strict.attributes.ambiguity).toBeLessThan(relaxed.attributes.ambiguity + 10);
    expect(strict.derivation.some((x) => x.includes('precise'))).toBe(true);
  });

  it('moderates harmful content in the dry voice but allows harmless absurdity', () => {
    const bad = moderate('bomb the neighbors');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.message).toMatch(/Committee|Office|scribes/);
    expect(moderate('Ban immigrants from the town').ok).toBe(false);
    expect(moderate('Everyone deserves a really tall chair.').ok).toBe(true);
    expect(moderate('Death metal.').ok).toBe(true);
    expect(moderate('War against beige walls (theatrically).').ok).toBe(true);
  });

  it('produces a founding proclamation referencing the movement', () => {
    const mv = createMovement(springismInput());
    const p = generateProclamation(mv, 'Hartford');
    expect(p).toContain('Springism');
    expect(p).toContain('Master J.');
    expect(p).toContain('Hootenannies');
    expect(p).toContain('Hartford');
  });
});
