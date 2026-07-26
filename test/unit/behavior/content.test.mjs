import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent, simpleHash, faqMatch, sim } from '../../../src/behavior/content.js';

describe('detectIntent', () => {
  it('greeting: halo, hai, pagi, siang, malam', () => {
    assert.equal(detectIntent('Halo, apa kabar?'), 'greeting');
    assert.equal(detectIntent('hai juga'), 'greeting');
    assert.equal(detectIntent('Selamat pagi'), 'greeting');
    assert.equal(detectIntent('Selamat siang'), 'greeting');
    assert.equal(detectIntent('Selamat malam'), 'greeting');
  });

  it('information: siapa, apa itu, jelaskan', () => {
    assert.equal(detectIntent('Siapa kamu?'), 'information');
    assert.equal(detectIntent('Apa itu wa-gateway?'), 'information');
    assert.equal(detectIntent('Jelaskan fiturnya'), 'information');
  });

  it('help: tolong, bantu, mohon, butuh', () => {
    assert.equal(detectIntent('Tolong saya'), 'help');
    assert.equal(detectIntent('Bantu saya'), 'help');
    assert.equal(detectIntent('Mohon bantuannya'), 'help');
  });

  it('question: kapan, berapa, dimana, bagaimana', () => {
    assert.equal(detectIntent('Kapan tersedia?'), 'question');
    assert.equal(detectIntent('Berapa harganya?'), 'question');
    assert.equal(detectIntent('Dimana alamatnya?'), 'question');
    assert.equal(detectIntent('Bagaimana caranya?'), 'question');
  });

  it('thanks: terima kasih, makasih, thanks', () => {
    assert.equal(detectIntent('Terima kasih'), 'thanks');
    assert.equal(detectIntent('Makasih banyak'), 'thanks');
    assert.equal(detectIntent('thanks'), 'thanks');
  });

  it('acknowledge: selesai, oke, ok, baik, iya, ya', () => {
    assert.equal(detectIntent('Selesai'), 'acknowledge');
    assert.equal(detectIntent('Oke'), 'acknowledge');
    assert.equal(detectIntent('Baik'), 'acknowledge');
    assert.equal(detectIntent('Iya'), 'acknowledge');
  });

  it('unknown: tidak dikenal return "unknown"', () => {
    assert.equal(detectIntent('xyzblabla'), 'unknown');
    assert.equal(detectIntent(''), 'unknown');
    assert.equal(detectIntent('   '), 'unknown');
  });
});

describe('simpleHash', () => {
  it('deterministik: hash sama untuk input sama', () => {
    assert.equal(simpleHash('halo'), simpleHash('halo'));
  });

  it('hash berbeda untuk input berbeda', () => {
    assert.notEqual(simpleHash('halo'), simpleHash('halo!'));
  });

  it('return hex string', () => {
    assert.match(simpleHash('test'), /^[0-9a-f]+$/);
  });

  it('tidak crash dengan string kosong', () => {
    assert.equal(typeof simpleHash(''), 'string');
  });

  it('tidak crash dengan string panjang', () => {
    const long = 'x'.repeat(10000);
    assert.equal(typeof simpleHash(long), 'string');
  });
});

describe('faqMatch', () => {
  const faqs = [
    { id: '1', question: 'Apa itu WA Gateway?', keywords: ['gateway', 'wa gateway', 'whatsapp gateway'], answer: 'WA Gateway adalah...' },
    { id: '2', question: 'Berapa harganya?', keywords: ['harga', 'biaya', 'price'], answer: 'Harga mulai dari Rp 100.000' },
    { id: '3', question: 'Cara daftar?', keywords: [], answer: 'Daftar di web...' },
  ];

  it('cocok via keyword', () => {
    const r = faqMatch('info harga paket', faqs);
    assert.equal(r.id, '2');
  });

  it('cocok via similarity question', () => {
    const r = faqMatch('Apa itu WA Gateaway?', faqs); // typo
    assert.equal(r.id, '1');
  });

  it('tidak cocok return null', () => {
    const r = faqMatch('xyz tidak ada di FAQ', faqs);
    assert.equal(r, null);
  });

  it('keyword case insensitive', () => {
    const r = faqMatch('INFO GATEWAY', faqs);
    assert.equal(r.id, '1');
  });

  it('FAQ tanpa keywords tetap bisa match via question similarity', () => {
    const r = faqMatch('cara daftar', faqs);
    assert.equal(r.id, '3');
  });
});

describe('sim (Levenshtein normalized)', () => {
  it('string identik return 1.0', () => {
    assert.equal(sim('halo', 'halo'), 1.0);
  });

  it('string berbeda total return 0', () => {
    assert.equal(sim('abc', 'xyz'), 0);
  });

  it('string sebagian mirip', () => {
    // 'kucing' (6) → 'kucing hitam' (12): distance=6, max=12, sim=0.5
    assert.equal(sim('kucing', 'kucing hitam'), 0.5);
  });

  it('satu string kosong return 0', () => {
    assert.equal(sim('', 'abc'), 0);
    assert.equal(sim('abc', ''), 0);
  });

  it('dua string kosong return NaN (division by zero)', () => {
    // Bug: Math.max(0,0) = 0 → 1 - 0/0 = NaN
    assert.ok(Number.isNaN(sim('', '')));
  });

  it('similaritas dengan string panjang', () => {
    const a = 'Selamat pagi, apa kabar hari ini?';
    const b = 'Selamat pagi, apa kabar?';
    assert.ok(sim(a, b) > 0.7);
  });
});
