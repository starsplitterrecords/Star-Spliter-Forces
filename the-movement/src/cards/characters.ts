// The recurring cast. Portraits are drawn procedurally from these specs (see Portrait.tsx).
import type { CardGame } from './types';

export interface Character {
  id: string;
  name: (g: CardGame) => string;
  role: string;
  skin: string;
  hair: string;
  coat: string;
  hat?: 'none' | 'top' | 'beret' | 'cap' | 'crown' | 'hood' | 'chef' | 'helmet' | 'bun';
  glasses?: boolean;
  mustache?: boolean;
  prop?: string; // a small emoji held or worn
  mood?: 'smile' | 'flat' | 'worried' | 'smug';
}

const fixed = (n: string) => () => n;

export const CHARACTERS: Record<string, Character> = {
  self: { id: 'self', name: fixed('Your Inner Voice'), role: 'Inspiration', skin: '#f2c9a0', hair: '#3a2a1a', coat: '#6b3fa0', hat: 'none', mood: 'smile', prop: '💡' },
  mom: { id: 'mom', name: fixed('Your Mother'), role: 'Family', skin: '#e8b98f', hair: '#b8b8c0', coat: '#c0392b', hat: 'bun', glasses: true, mood: 'worried', prop: '☎️' },
  cousin: { id: 'cousin', name: fixed('Cousin Rupert'), role: 'Real estate (informal)', skin: '#d9a77c', hair: '#7a4a1a', coat: '#2e8b57', hat: 'cap', mood: 'smug', prop: '🔑' },
  first: { id: 'first', name: fixed('Gwendolyn Larkspur'), role: 'First Follower', skin: '#8d5a3b', hair: '#1a1a1a', coat: '#e67e22', hat: 'beret', mood: 'smile', prop: '📋' },
  dream: { id: 'dream', name: fixed('A Vivid Dream'), role: 'Omen', skin: '#b9a7e8', hair: '#6b5aa0', coat: '#2c3e50', hat: 'hood', mood: 'flat', prop: '🌙' },
  artist: { id: 'artist', name: fixed('Lysander Puddington'), role: 'Official Artist', skin: '#f0c8a8', hair: '#d4a72c', coat: '#16a085', hat: 'beret', mustache: true, mood: 'smug', prop: '🎨' },
  treasurer: { id: 'treasurer', name: fixed('Penelope Ledger-Smythe'), role: 'Treasurer', skin: '#c68a62', hair: '#2a1a10', coat: '#3d5a80', hat: 'none', glasses: true, mood: 'flat', prop: '🪙' },
  zealot: { id: 'zealot', name: fixed('Brother Barnaby'), role: 'Head Zealot', skin: '#e0a080', hair: '#5a1a1a', coat: '#9b2226', hat: 'hood', mood: 'smug', prop: '🔥' },
  press: { id: 'press', name: fixed('Delphine Quibble'), role: 'The Evening Clarion', skin: '#f5d0b0', hair: '#c0392b', coat: '#222222', hat: 'none', glasses: true, mood: 'smug', prop: '📰' },
  mayor: { id: 'mayor', name: fixed('Mayor Thaddeus Grubb'), role: 'Local Government', skin: '#e0b090', hair: '#888888', coat: '#2c3e50', hat: 'top', mustache: true, mood: 'worried', prop: '🏛️' },
  scholar: { id: 'scholar', name: fixed('Prof. Ottoline Fennimore'), role: 'Doctrinal Scholar', skin: '#a86b4a', hair: '#e8e8e8', coat: '#8e44ad', hat: 'none', glasses: true, mood: 'flat', prop: '📜' },
  committee: { id: 'committee', name: fixed('Chair Mortimer Snodgrass'), role: 'Committee on Committees', skin: '#f0d0b8', hair: '#4a4a4a', coat: '#7a8399', hat: 'none', glasses: true, mustache: true, mood: 'flat', prop: '📎' },
  merch: { id: 'merch', name: fixed('Montgomery "Monty" Plumtree'), role: 'Merchandise Division', skin: '#d29a70', hair: '#f1c40f', coat: '#e84393', hat: 'cap', mood: 'smile', prop: '🧢' },
  official: { id: 'official', name: fixed('Undersecretary Prudence Kettleby'), role: 'Ministry of Ordinary Affairs', skin: '#c79878', hair: '#3a3a3a', coat: '#4b5468', hat: 'none', glasses: true, mood: 'worried', prop: '🗂️' },
  youth: { id: 'youth', name: fixed('Cassius Oddfellow'), role: 'Youth Wing', skin: '#9a6a4a', hair: '#94d2bd', coat: '#0a9396', hat: 'cap', mood: 'smug', prop: '📱' },
  celebrity: { id: 'celebrity', name: fixed('Esmerelda Vantablack'), role: 'Beloved TV Personality', skin: '#f0c0a0', hair: '#f4f1de', coat: '#ee6c4d', hat: 'none', mood: 'smile', prop: '⭐' },
  rival: { id: 'rival', name: (g) => String(g.flags.rivalName ? RIVAL_NAMES[g.flags.rivalName % RIVAL_NAMES.length] : 'Grand Overseer Cuthbertson'), role: 'Rival Founder', skin: '#d0a080', hair: '#111111', coat: '#5a6fc4', hat: 'crown', mustache: true, mood: 'smug', prop: '😤' },
  defector: { id: 'defector', name: fixed('Ezekiel Bramblecombe'), role: 'Former Member', skin: '#b07a5a', hair: '#6a4a2a', coat: '#7a7a2a', hat: 'hood', mood: 'worried', prop: '🚪' },
  scientist: { id: 'scientist', name: fixed('Dr. Wilhelmina Merriweather'), role: 'Institute of Studies', skin: '#e8c0a0', hair: '#2a2a2a', coat: '#f4f1de', hat: 'none', glasses: true, mood: 'flat', prop: '🔬' },
  chef: { id: 'chef', name: fixed('Chef Augustin Noggins'), role: 'Official Caterer', skin: '#d8a888', hair: '#3a2a1a', coat: '#ffffff', hat: 'chef', mustache: true, mood: 'smile', prop: '🍲' },
  tailor: { id: 'tailor', name: fixed('Hortense Thistlewood'), role: 'Ceremonial Tailor', skin: '#f2c9a0', hair: '#8e44ad', coat: '#d4a72c', hat: 'beret', glasses: true, mood: 'smug', prop: '🧵' },
  dj: { id: 'dj', name: fixed('DJ Fitzgerald'), role: 'Minister of Sound', skin: '#6a4030', hair: '#111111', coat: '#222222', hat: 'cap', mood: 'smile', prop: '🎧' },
  architect: { id: 'architect', name: fixed('Cornelius Bramble'), role: 'Architect', skin: '#e0b898', hair: '#a8afc0', coat: '#16a085', hat: 'helmet', mood: 'flat', prop: '📐' },
  doctor: { id: 'doctor', name: fixed('Dr. Agatha Crumplehorn'), role: 'Physician', skin: '#c08a68', hair: '#e8e8e8', coat: '#f4f1de', hat: 'none', glasses: true, mood: 'worried', prop: '🩺' },
  delegate: { id: 'delegate', name: fixed('Ambassador Leopold Wigglesworth'), role: 'United Nations of the Fictional World', skin: '#d8b090', hair: '#5a5a5a', coat: '#1f6f8b', hat: 'top', mood: 'flat', prop: '🌐' },
  animal: { id: 'animal', name: (g) => `The ${g.movement.animal}`, role: 'Spirit Animal', skin: '#a0866a', hair: '#7a5a3a', coat: '#7a5a3a', hat: 'none', mood: 'flat', prop: '🐾' },
  heckler: { id: 'heckler', name: fixed('A Heckler'), role: 'Member of the Public', skin: '#e0b090', hair: '#6a2a1a', coat: '#7a8399', hat: 'cap', mood: 'smug', prop: '📣' },
};

export const RIVAL_NAMES = ['Grand Overseer Cuthbertson', 'High Facilitator Dunderdale', 'Prime Instigator Mumbleby', 'Lord Chancellor Ashgrove', 'Chief Herald Pickering'];

export function character(id: string): Character {
  return CHARACTERS[id] ?? CHARACTERS.heckler;
}
